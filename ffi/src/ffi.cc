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

#include <napi.h>
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
        type->members.Append(member);
    }

#if RG_SIZE_MAX == INT64_MAX
    type->irregular = (type->size != 1 && type->size != 2 && type->size != 4 && type->size != 8);
#else
    type->irregular = (type->size != 1 && type->size != 2 && type->size != 4);
#endif

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
    if (!info[0].IsString() || !info[1].IsObject()) {
        Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::shared_ptr<LibraryData> lib = std::make_shared<LibraryData>();
    Napi::Object obj = Napi::Object::New(env);

    // Load shared library
    {
        std::u16string filename = info[0].As<Napi::String>();

        HANDLE h = LoadLibraryW((LPCWSTR)filename.c_str());
        if (!h) {
            Napi::Error::New(env, "Failed to load shared library").ThrowAsJavaScriptException();
            return env.Null();
        }

        lib->module = h;
    }

    Napi::Object functions = info[1].As<Napi::Array>();
    Napi::Array keys = functions.GetPropertyNames();

    for (uint32_t i = 0; i < keys.Length(); i++) {
        FunctionInfo *func = new FunctionInfo();
        RG_DEFER_N(func_guard) { delete func; };

        std::string key = ((Napi::Value)keys[i]).As<Napi::String>();
        Napi::Array value = ((Napi::Value)functions[key]).As<Napi::Array>();

        func->name = DuplicateString(key.c_str(), &lib->str_alloc).ptr;

        if (!value.IsArray() || value.Length() < 2 || !((Napi::Value)value[1]).IsArray()) {
            Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
            return env.Null();
        }

        func->lib = lib;
        func->func = (void *)GetProcAddress((HMODULE)lib->module, key.c_str());
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
    if (module) {
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

    RG_ASSERT(!types_map.Find(name));
    types_map.Set(type);
}

}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    using namespace RG;

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

    exports.Set("struct", Napi::Function::New(env, CreateStruct));
    exports.Set("pointer", Napi::Function::New(env, CreatePointer));
    exports.Set("load", Napi::Function::New(env, LoadSharedLibrary));

    return exports;
}

NODE_API_MODULE(addon, Init);
