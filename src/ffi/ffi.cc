// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see https://www.gnu.org/licenses/.

#include "libcc.hh"
#include "ffi.hh"
#include "call.hh"

#ifdef _WIN32
    #ifndef NOMINMAX
        #define NOMINMAX
    #endif
    #ifndef WIN32_LEAN_AND_MEAN
        #define WIN32_LEAN_AND_MEAN
    #endif
    #include <windows.h>
#else
    #include <dlfcn.h>
    #include <unistd.h>
#endif

#include <napi.h>
#if NODE_WANT_INTERNALS
    #include <env-inl.h>
    #include <js_native_api_v8.h>
#endif

namespace RG {

struct InstanceData {
    BucketArray<TypeInfo> types;
    HashTable<const char *, const TypeInfo *> types_map;

    BlockAllocator str_alloc;
};

static const TypeInfo *ResolveType(const InstanceData *instance, Napi::Value value)
{
    if (value.IsString()) {
        std::string str = value.As<Napi::String>();

        const TypeInfo *type = instance->types_map.FindValue(str.c_str(), nullptr);

        if (!type) {
            ThrowError<Napi::TypeError>(value.Env(), "Unknown type string '%1'", str.c_str());
            return nullptr;
        }

        return type;
    } else if (value.IsExternal()) {
        Napi::External<TypeInfo> external = value.As<Napi::External<TypeInfo>>();

        const TypeInfo *type = external.Data();
        RG_ASSERT(type);

        return type;
    } else {
        ThrowError<Napi::TypeError>(value.Env(), "Unexpected %1 value as type specifier, expected string or external", GetTypeName(value.Type()));
        return nullptr;
    }
}

Napi::Value CreateStruct(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    InstanceData *instance = env.GetInstanceData<InstanceData>();

    if (info.Length() < 2) {
        ThrowError<Napi::TypeError>(env, "Expected 2 arguments, got %1", info.Length());
        return env.Null();
    }
    if (!info[0].IsString()) {
        ThrowError<Napi::TypeError>(env, "Unexpected %1 value for name, expected string", GetTypeName(info[0].Type()));
        return env.Null();
    }
    if (!info[1].IsObject()) {
        ThrowError<Napi::TypeError>(env, "Unexpected %1 value for members, expected object", GetTypeName(info[1].Type()));
        return env.Null();
    }

    TypeInfo *type = instance->types.AppendDefault();

    std::string name = info[0].As<Napi::String>();
    Napi::Object obj = info[1].As<Napi::Object>();
    Napi::Array keys = obj.GetPropertyNames();

    type->name = DuplicateString(name.c_str(), &instance->str_alloc).ptr;
    type->primitive = PrimitiveKind::Record;
    type->align = 1;

    for (uint32_t i = 0; i < keys.Length(); i++) {
        RecordMember member = {};

        std::string key = ((Napi::Value)keys[i]).As<Napi::String>();
        Napi::Value value = obj[key];

        member.name = DuplicateString(key.c_str(), &instance->str_alloc).ptr;
        member.type = ResolveType(instance, value);
        if (!member.type)
            return env.Null();

        type->size += member.type->size;
        type->align = std::max(type->align, member.type->align);

        type->members.Append(member);
    }

    type->size = AlignLen(type->size, type->align);

    if (!instance->types_map.TrySet(type).second) {
        ThrowError<Napi::Error>(env, "Duplicate type name '%1'", type->name);
        return env.Null();
    }

    Napi::External external = Napi::External<TypeInfo>::New(env, type);
    return external;
}

Napi::Value CreatePointer(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    InstanceData *instance = env.GetInstanceData<InstanceData>();

    if (info.Length() < 1) {
        ThrowError<Napi::TypeError>(env, "Expected 1 argument, got %1", info.Length());
        return env.Null();
    }

    const TypeInfo *ref = ResolveType(instance, info[0]);
    if (!ref)
        return env.Null();

    TypeInfo *type = instance->types.AppendDefault();

    type->name = Fmt(&instance->str_alloc, "%1%2*", ref->name, ref->primitive == PrimitiveKind::Pointer ? "" : " ").ptr;

    type->primitive = PrimitiveKind::Pointer;
    type->size = sizeof(void *);
    type->align = sizeof(void *);

    type->ref = ref;

    return Napi::External<TypeInfo>::New(env, type);
}

Napi::Value LoadSharedLibrary(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    InstanceData *instance = env.GetInstanceData<InstanceData>();

    if (info.Length() < 2) {
        ThrowError<Napi::TypeError>(env, "Expected 2 arguments, not %1", info.Length());
        return env.Null();
    }
    if (!info[0].IsString() && !info[0].IsNull()) {
        ThrowError<Napi::TypeError>(env, "Unexpected %1 value for filename, expected string or null", GetTypeName(info[0].Type()));
        return env.Null();
    }
    if (!info[1].IsObject()) {
        ThrowError<Napi::TypeError>(env, "Unexpected %1 value for functions, expected object", GetTypeName(info[1].Type()));
        return env.Null();
    }

    std::shared_ptr<LibraryData> lib = std::make_shared<LibraryData>();
    lib->stack.AppendDefault(Mebibytes(1));

    Napi::Object obj = Napi::Object::New(env);

    // Load shared library
    {
#ifdef _WIN32
        if (info[0].IsString()) {
            std::u16string filename = info[0].As<Napi::String>();
            lib->module = LoadLibraryW((LPCWSTR)filename.c_str());

            if (!lib->module) {
                ThrowError<Napi::Error>(env, "Failed to load shared library: %1", GetWin32ErrorString());
                return env.Null();
            }
        } else {
            lib->module = GetModuleHandle(nullptr);
            RG_ASSERT(lib->module);
        }

#else
        if (info[0].IsString()) {
            std::string filename = info[0].As<Napi::String>();
            lib->module = dlopen(filename.c_str(), RTLD_NOW);

            if (!lib->module) {
                const char *msg = dlerror();

                if (StartsWith(msg, filename.c_str()))
                    msg += filename.length();
                while (strchr(": ", msg[0])) {
                    msg++;
                }

                ThrowError<Napi::Error>(env, "Failed to load shared library: %1", msg);
                return env.Null();
            }
        } else {
            lib->module = RTLD_DEFAULT;
        }
#endif
    }

    Napi::Object functions = info[1].As<Napi::Array>();
    Napi::Array keys = functions.GetPropertyNames();

    for (uint32_t i = 0; i < keys.Length(); i++) {
        FunctionInfo *func = new FunctionInfo();
        RG_DEFER_N(func_guard) { delete func; };

        std::string key = ((Napi::Value)keys[i]).As<Napi::String>();
        Napi::Array value = ((Napi::Value)functions[key]).As<Napi::Array>();

        func->name = DuplicateString(key.c_str(), &lib->str_alloc).ptr;
        func->lib = lib;

        if (!value.IsArray()) {
            ThrowError<Napi::TypeError>(env, "Unexpexted %1 value for signature of '%2', expected an array", GetTypeName(value.Type()), func->name);
            return env.Null();
        }
        if (value.Length() != 2) {
            ThrowError<Napi::TypeError>(env, "Unexpected array of length %1 for '%2', expected 2 elements", value.Length(), func->name);
            return env.Null();
        }
        if (!((Napi::Value)value[1]).IsArray()) {
            ThrowError<Napi::TypeError>(env, "Unexpected %1 value for parameters of '%2', expected an array", GetTypeName(((Napi::Value)value[1]).Type()), func->name);
            return env.Null();
        }

#ifdef _WIN32
        func->func = (void *)GetProcAddress((HMODULE)lib->module, key.c_str());
#else
        func->func = dlsym(lib->module, key.c_str());
#endif
        if (!func->func) {
            ThrowError<Napi::Error>(env, "Cannot find function '%1' in shared library", key.c_str());
            return env.Null();
        }

        Napi::Array parameters = ((Napi::Value)value[1u]).As<Napi::Array>();

        func->ret.type = ResolveType(instance, value[0u]);
        if (!func->ret.type)
            return env.Null();

        for (uint32_t j = 0; j < parameters.Length(); j++) {
            ParameterInfo param = {};

            param.type = ResolveType(instance, parameters[j]);
            if (!param.type)
                return env.Null();
            if (param.type->primitive == PrimitiveKind::Void) {
                ThrowError<Napi::TypeError>(env, "Type void cannot be used as a parameter");
                return env.Null();
            }
            func->parameters.Append(param);

            func->args_size += AlignLen(param.type->size, 16);
        }

        if (!AnalyseFunction(func))
            return env.Null();

        Napi::Function wrapper = Napi::Function::New(env, TranslateCall, key.c_str(), (void *)func);
        wrapper.AddFinalizer([](Napi::Env, FunctionInfo *func) { delete func; }, func);
        func_guard.Disable();

        obj.Set(key, wrapper);
    }

    return obj;
}

LibraryData::~LibraryData()
{
#ifdef _WIN32
    if (module && module != GetModuleHandle(nullptr)) {
        FreeLibrary((HMODULE)module);
    }
#else
    if (module && module != RTLD_DEFAULT) {
        dlclose(module);
    }
#endif
}

static void RegisterPrimitiveType(InstanceData *instance, const char *name, PrimitiveKind primitive, int16_t size)
{
    TypeInfo *type = instance->types.AppendDefault();

    type->name = name;

    type->primitive = primitive;
    type->size = size;
    type->align = size;

    RG_ASSERT(!instance->types_map.Find(name));
    instance->types_map.Set(type);
}

static Napi::Object InitBaseTypes(Napi::Env env)
{
    InstanceData *instance = env.GetInstanceData<InstanceData>();

    RG_ASSERT(!instance->types.len);

    RegisterPrimitiveType(instance, "void", PrimitiveKind::Void, 0);
    RegisterPrimitiveType(instance, "bool", PrimitiveKind::Bool, 1);
    RegisterPrimitiveType(instance, "int8", PrimitiveKind::Int8, 1);
    RegisterPrimitiveType(instance, "uint8", PrimitiveKind::UInt8, 1);
    RegisterPrimitiveType(instance, "char", PrimitiveKind::Int8, 1);
    RegisterPrimitiveType(instance, "uchar", PrimitiveKind::UInt8, 1);
    RegisterPrimitiveType(instance, "int16", PrimitiveKind::Int16, 2);
    RegisterPrimitiveType(instance, "uint16", PrimitiveKind::UInt16, 2);
    RegisterPrimitiveType(instance, "short", PrimitiveKind::Int16, 2);
    RegisterPrimitiveType(instance, "ushort", PrimitiveKind::UInt16, 2);
    RegisterPrimitiveType(instance, "int32", PrimitiveKind::Int32, 4);
    RegisterPrimitiveType(instance, "uint32", PrimitiveKind::UInt32, 4);
    RegisterPrimitiveType(instance, "int", PrimitiveKind::Int32, 4);
    RegisterPrimitiveType(instance, "uint", PrimitiveKind::UInt32, 4);
    RegisterPrimitiveType(instance, "int64", PrimitiveKind::Int64, 8);
    RegisterPrimitiveType(instance, "uint64", PrimitiveKind::UInt64, 8);
    RegisterPrimitiveType(instance, "float32", PrimitiveKind::Float32, 4);
    RegisterPrimitiveType(instance, "float64", PrimitiveKind::Float64, 8);
    RegisterPrimitiveType(instance, "float", PrimitiveKind::Float32, 4);
    RegisterPrimitiveType(instance, "double", PrimitiveKind::Float64, 8);
    RegisterPrimitiveType(instance, "string", PrimitiveKind::String, sizeof(void *));

    Napi::Object types = Napi::Object::New(env);
    for (TypeInfo &type: instance->types) {
        Napi::External<TypeInfo> external = Napi::External<TypeInfo>::New(env, &type);
        types.Set(type.name, external);
    }
    types.Freeze();

    return types;
}

}

#if NODE_WANT_INTERNALS

static void SetValue(node::Environment *env, v8::Local<v8::Object> target,
                     const char *name, Napi::Value value)
{
    v8::Isolate *isolate = env->isolate();
    v8::Local<v8::Context> context = isolate->GetCurrentContext();

    v8::NewStringType str_type = v8::NewStringType::kInternalized;
    v8::Local<v8::String> str = v8::String::NewFromUtf8(isolate, name, str_type).ToLocalChecked();

    target->Set(context, str, v8impl::V8LocalValueFromJsValue(value)).Check();
}

static void InitInternal(v8::Local<v8::Object> target, v8::Local<v8::Value>,
                         v8::Local<v8::Context> context, void *)
{
    using namespace RG;

    node::Environment *env = node::Environment::GetCurrent(context);

    // Not very clean but I don't know enough about Node and V8 to do better...
    // ... and it seems to work okay.
    napi_env env_napi = new napi_env__(context);
    Napi::Env env_cxx(env_napi);
    env->AtExit([](void *udata) {
        napi_env env_napi = (napi_env)udata;
        delete env_napi;
    }, env_napi);

    InstanceData *instance = new InstanceData();
    env_cxx.SetInstanceData(instance);

    SetValue(env, target, "struct", Napi::Function::New(env_napi, CreateStruct));
    SetValue(env, target, "pointer", Napi::Function::New(env_napi, CreatePointer));
    SetValue(env, target, "load", Napi::Function::New(env_napi, LoadSharedLibrary));
    SetValue(env, target, "internal", Napi::Boolean::New(env_napi, true));

    Napi::Object types = InitBaseTypes(env_cxx);
    SetValue(env, target, "types", types);
}

#else

static Napi::Object InitModule(Napi::Env env, Napi::Object exports)
{
    using namespace RG;

    InstanceData *instance = new InstanceData();
    env.SetInstanceData(instance);

    exports.Set("struct", Napi::Function::New(env, CreateStruct));
    exports.Set("pointer", Napi::Function::New(env, CreatePointer));
    exports.Set("load", Napi::Function::New(env, LoadSharedLibrary));
    exports.Set("internal", Napi::Boolean::New(env, false));

    Napi::Object types = InitBaseTypes(env);
    exports.Set("types", types);

    return exports;
}

#endif

#if NODE_WANT_INTERNALS
    NODE_MODULE_CONTEXT_AWARE_INTERNAL(ffi, InitInternal);
#else
    NODE_API_MODULE(ffi, InitModule);
#endif
