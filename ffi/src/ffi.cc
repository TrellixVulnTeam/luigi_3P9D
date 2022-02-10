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

#include <napi.h>
#if NODE_WANT_INTERNALS
    #include <env-inl.h>
    #include <js_native_api_v8.h>
#endif
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

namespace RG {

static BucketArray<TypeInfo> types;
static HashTable<const char *, const TypeInfo *> types_map;
static BlockAllocator types_alloc;

static const TypeInfo *ResolveType(Napi::Value value)
{
    if (value.IsString()) {
        std::string str = value.As<Napi::String>();

        const TypeInfo *type = types_map.FindValue(str.c_str(), nullptr);
        return type;
    } else if (value.IsExternal()) {
        Napi::External<TypeInfo> external = value.As<Napi::External<TypeInfo>>();

        const TypeInfo *type = external.Data();
        return type;
    } else {
        return nullptr;
    }
}

// XXX: Adjust size to consider alignment issues
Napi::Value CreateStruct(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (!info[0].IsString() || !info[1].IsObject()) {
        Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
        return env.Null();
    }

    TypeInfo *type = types.AppendDefault();

    std::string name = info[0].As<Napi::String>();
    Napi::Object obj = info[1].As<Napi::Object>();
    Napi::Array keys = obj.GetPropertyNames();

    type->name = DuplicateString(name.c_str(), &types_alloc).ptr;
    type->primitive = PrimitiveKind::Record;
    type->all_fp = true;

    for (uint32_t i = 0; i < keys.Length(); i++) {
        RecordMember member = {};

        std::string key = ((Napi::Value)keys[i]).As<Napi::String>();
        Napi::Value value = obj[key];

        member.name = DuplicateString(key.c_str(), &types_alloc).ptr;
        member.type = ResolveType(value);
        if (!member.type) {
            Napi::Error::New(env, "Invalid type specifier").ThrowAsJavaScriptException();
            return env.Null();
        }

        type->size += member.type->size;
        type->has_fp |= member.type->has_fp;
        type->all_fp &= member.type->all_fp;

        type->members.Append(member);
    }

    type->is_small = (type->size <= sizeof(void *));
    type->is_regular = type->is_small && !(type->size & (type->size - 1));

    return Napi::External<TypeInfo>::New(env, type);
}

Napi::Value CreatePointer(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
        return env.Null();
    }

    const TypeInfo *ref = ResolveType(info[0]);
    if (!ref) {
        Napi::Error::New(env, "Invalid type specifier").ThrowAsJavaScriptException();
        return env.Null();
    }

    TypeInfo *type = types.AppendDefault();

    type->name = Fmt(&types_alloc, "%1%2*", ref->name, ref->primitive == PrimitiveKind::Pointer ? "" : " ").ptr;

    type->primitive = PrimitiveKind::Pointer;
    type->size = 8;
    type->is_small = true;
    type->is_regular = true;

    type->ref = ref;

    return Napi::External<TypeInfo>::New(env, type);
}

Napi::Value LoadSharedLibrary(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
        return env.Null();
    }
    if ((!info[0].IsString() && !info[0].IsNull()) || !info[1].IsObject()) {
        Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::shared_ptr<LibraryData> lib = std::make_shared<LibraryData>();
    Napi::Object obj = Napi::Object::New(env);

    // Load shared library
    {
#ifdef _WIN32
        if (info[0].IsString()) {
            std::u16string filename = info[0].As<Napi::String>();
            lib->module = LoadLibraryW((LPCWSTR)filename.c_str());
        } else {
            lib->module = GetModuleHandle(nullptr);
        }

        if (!lib->module) {
            Napi::Error::New(env, "Failed to load shared library").ThrowAsJavaScriptException();
            return env.Null();
        }
#else
        if (info[0].IsString()) {
            std::string filename = info[0].As<Napi::String>();
            lib->module = dlopen(filename.c_str(), RTLD_NOW);
        } else {
            lib->module = RTLD_DEFAULT;
        }

        if (!lib->module) {
            Napi::Error::New(env, "Failed to load shared library").ThrowAsJavaScriptException();
            return env.Null();
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

        if (!value.IsArray() || value.Length() < 2 || !((Napi::Value)value[1]).IsArray()) {
            Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
            return env.Null();
        }

#ifdef _WIN32
        func->func = (void *)GetProcAddress((HMODULE)lib->module, key.c_str());
#else
        func->func = dlsym(lib->module, key.c_str());
#endif
        if (!func->func) {
            Napi::Error::New(env, "Cannot find function in shared library").ThrowAsJavaScriptException();
            return env.Null();
        }

        Napi::Array parameters = ((Napi::Value)value[1u]).As<Napi::Array>();

        func->return_type = ResolveType(value[0u]);
        if (!func->return_type) {
            Napi::Error::New(env, "Invalid type specifier").ThrowAsJavaScriptException();
            return env.Null();
        }

        for (uint32_t j = 0; j < parameters.Length(); j++) {
            const TypeInfo *type = ResolveType(parameters[j]);
            if (!type || type->primitive == PrimitiveKind::Void) {
                Napi::Error::New(env, "Invalid type specifier").ThrowAsJavaScriptException();
                return env.Null();
            }
            func->parameters.Append(type);

            func->args_size += AlignLen(type->size, 16);
            func->irregular_size += type->is_regular ? 0 : AlignLen(type->size, 16);
        }

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
    if (module) {
        dlclose(module);
    }
#endif
}

static void RegisterPrimitiveType(const char *name, PrimitiveKind primitive, Size size)
{
    TypeInfo *type = types.AppendDefault();

    type->name = name;

    type->primitive = primitive;
    type->size = size;
    type->is_small = true;
    type->is_regular = true;
    type->has_fp = (primitive == PrimitiveKind::Float32 || primitive == PrimitiveKind::Float64);
    type->all_fp = type->has_fp;

    RG_ASSERT(!types_map.Find(name));
    types_map.Set(type);
}

static void InitBaseTypes()
{
    RegisterPrimitiveType("void", PrimitiveKind::Void, 0);
    RegisterPrimitiveType("bool", PrimitiveKind::Bool, 1);
    RegisterPrimitiveType("int8", PrimitiveKind::Int8, 1);
    RegisterPrimitiveType("uint8", PrimitiveKind::UInt8, 1);
    RegisterPrimitiveType("char", PrimitiveKind::Int8, 1);
    RegisterPrimitiveType("uchar", PrimitiveKind::UInt8, 1);
    RegisterPrimitiveType("int16", PrimitiveKind::Int16, 2);
    RegisterPrimitiveType("uint16", PrimitiveKind::UInt16, 2);
    RegisterPrimitiveType("short", PrimitiveKind::Int16, 2);
    RegisterPrimitiveType("ushort", PrimitiveKind::UInt16, 2);
    RegisterPrimitiveType("int32", PrimitiveKind::Int32, 4);
    RegisterPrimitiveType("uint32", PrimitiveKind::UInt32, 4);
    RegisterPrimitiveType("int", PrimitiveKind::Int32, 4);
    RegisterPrimitiveType("uint", PrimitiveKind::UInt32, 4);
    RegisterPrimitiveType("int64", PrimitiveKind::Int64, 8);
    RegisterPrimitiveType("uint64", PrimitiveKind::UInt64, 8);
    RegisterPrimitiveType("float32", PrimitiveKind::Float32, 4);
    RegisterPrimitiveType("float64", PrimitiveKind::Float64, 8);
    RegisterPrimitiveType("float", PrimitiveKind::Float32, 4);
    RegisterPrimitiveType("double", PrimitiveKind::Float64, 8);
    RegisterPrimitiveType("string", PrimitiveKind::String, 8);
}

#if NODE_WANT_INTERNALS

static inline v8::Local<v8::Value> V8LocalValueFromJsValue(napi_value v) {
    v8::Local<v8::Value> local;
    memcpy(static_cast<void*>(&local), &v, sizeof(v));
    return local;
}

static void SetMethod(node::Environment *env, v8::Local<v8::Object> target,
                      const char *name, const Napi::Function &func)
{
    v8::Isolate *isolate = env->isolate();
    v8::Local<v8::Context> context = isolate->GetCurrentContext();

    v8::NewStringType str_type = v8::NewStringType::kInternalized;
    v8::Local<v8::String> str = v8::String::NewFromUtf8(isolate, name, str_type).ToLocalChecked();

    target->Set(context, str, V8LocalValueFromJsValue(func)).Check();
}

static void InitInternal(v8::Local<v8::Object> target, v8::Local<v8::Value>,
                         v8::Local<v8::Context> context, void *)
{
    node::Environment *env = node::Environment::GetCurrent(context);

    InitBaseTypes();

    // Not thread safe
    static napi_env__ env_napi(context);
    static Napi::Env env_cxx(&env_napi);

    SetMethod(env, target, "struct", Napi::Function::New(env_cxx, CreateStruct));
    SetMethod(env, target, "pointer", Napi::Function::New(env_cxx, CreatePointer));
    SetMethod(env, target, "load", Napi::Function::New(env_cxx, LoadSharedLibrary));
}

#else

static Napi::Value InitModule(Napi::Env env, Napi::Object exports)
{
    InitBaseTypes();

    exports.Set("struct", Napi::Function::New(env, CreateStruct));
    exports.Set("pointer", Napi::Function::New(env, CreatePointer));
    exports.Set("load", Napi::Function::New(env, LoadSharedLibrary));

    return exports;
}

#endif

}

#if NODE_WANT_INTERNALS
    NODE_MODULE_CONTEXT_AWARE_INTERNAL(ffi, RG::InitInternal);
#else
    NAPI_MODULE(ffi, RG::InitModule);
#endif
