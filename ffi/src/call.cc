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

namespace RG {

static inline const char *CopyNodeString(const Napi::Value &value, Allocator *alloc)
{
    Napi::Env env = value.Env();
    napi_status status;

    size_t len = 0;
    status = napi_get_value_string_utf8(env, value, nullptr, 0, &len);
    RG_ASSERT(status == napi_ok);

    Span<char> buf;
    buf.len = (Size)len + 1;
    buf.ptr = (char *)Allocator::Allocate(alloc, buf.len);

    status = napi_get_value_string_utf8(env, value, buf.ptr, (size_t)buf.len, &len);
    RG_ASSERT(status == napi_ok);

    return buf.ptr;
}

static inline Size AlignLen(Size len, Size align)
{
    Size aligned = (len + align - 1) / align * align;
    return aligned;
}

static inline uint8_t *AlignUp(uint8_t *ptr, Size align)
{
    uint8_t *aligned = (uint8_t *)(((uintptr_t)ptr + align - 1) / align * align);
    return aligned;
}
static inline const uint8_t *AlignUp(const uint8_t *ptr, Size align)
{
    const uint8_t *aligned = (const uint8_t *)(((uintptr_t)ptr + align - 1) / align * align);
    return aligned;
}

static bool PushObject(const Napi::Object &obj, const TypeInfo *type, Allocator *alloc, uint8_t *dest)
{
    RG_ASSERT(obj.IsObject());
    RG_ASSERT(type->primitive == PrimitiveKind::Record);

    for (const RecordMember &member: type->members) {
        Napi::Value value = obj.Get(member.name);

        if (value.IsUndefined())
            return false;

        switch (member.type->primitive) {
            case PrimitiveKind::Void: { RG_UNREACHABLE(); } break;

            case PrimitiveKind::Bool:
            case PrimitiveKind::Int8:
            case PrimitiveKind::UInt8:
            case PrimitiveKind::Int16:
            case PrimitiveKind::UInt16:
            case PrimitiveKind::Int32:
            case PrimitiveKind::UInt32:
            case PrimitiveKind::Int64:
            case PrimitiveKind::UInt64: {
                dest = AlignUp(dest, member.type->size);

                if (value.IsNumber()) {
                    int64_t v = value.As<Napi::Number>();
                    memcpy(dest, &v, member.type->size); // Works on Little Endian machines (aka everyone)
                } else if (value.IsBigInt()) {
                    Napi::BigInt bigint = value.As<Napi::BigInt>();

                    bool lossless;
                    uint64_t v = bigint.Uint64Value(&lossless);

                    memcpy(dest, &v, member.type->size); // Works on Little Endian machines (aka everyone)
                } else {
                    return false;
                }
            } break;
            case PrimitiveKind::Float32: {
                dest = AlignUp(dest, 4);

                if (value.IsNumber()) {
                    float f = value.As<Napi::Number>();
                    memcpy(dest, &f, 4);
                } else if (value.IsBigInt()) {
                    Napi::BigInt bigint = value.As<Napi::BigInt>();

                    bool lossless;
                    float f = (float)bigint.Uint64Value(&lossless);

                    memcpy(dest, &f, 4);
                } else {
                    return false;
                }
            } break;
            case PrimitiveKind::Float64: {
                dest = AlignUp(dest, 8);

                if (value.IsNumber()) {
                    double d = value.As<Napi::Number>();
                    memcpy(dest, &d, 8);
                } else if (value.IsBigInt()) {
                    Napi::BigInt bigint = value.As<Napi::BigInt>();

                    bool lossless;
                    double d = (double)bigint.Uint64Value(&lossless);

                    memcpy(dest, &d, 8);
                } else {
                    return false;
                }
            } break;
            case PrimitiveKind::String: {
                dest = AlignUp(dest, 8);

                if (!value.IsString())
                    return false;

                const char *str = CopyNodeString(value, alloc);
                *(const char **)dest = str;
            } break;

            case PrimitiveKind::Record: {
                if (!value.IsObject())
                    return false;

                Napi::Object obj = value.As<Napi::Object>();
                if (!PushObject(obj, member.type, alloc, dest))
                    return false;
            } break;

            case PrimitiveKind::Pointer: {
                dest = AlignUp(dest, 8);

                if (!value.IsExternal())
                    return false;

                Napi::External external = value.As<Napi::External<void>>();
                void *ptr = external.Data();
                *(void **)dest = ptr;
            } break;
        }

        dest += member.type->size;
    }

    return true;
}

static Napi::Object PopObject(napi_env env, const uint8_t *ptr, const TypeInfo *type)
{
    RG_ASSERT(type->primitive == PrimitiveKind::Record);

    Napi::Object obj = Napi::Object::New(env);

    for (const RecordMember &member: type->members) {
        // XXX: ptr = AlignUp(ptr, member.type->size);

        switch (member.type->primitive) {
            case PrimitiveKind::Void: { RG_UNREACHABLE(); } break;

            case PrimitiveKind::Bool: {
                bool b = *(bool *)ptr;
                obj.Set(member.name, Napi::Boolean::New(env, b));
            } break;
            case PrimitiveKind::Int8: {
                double d = (double)*(int8_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::UInt8: {
                double d = (double)*(uint8_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::Int16: {
                double d = (double)*(int16_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::UInt16: {
                double d = (double)*(uint16_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::Int32: {
                double d = (double)*(int32_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::UInt32: {
                double d = (double)*(uint32_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::Int64: {
                int64_t v = *(int64_t *)ptr;
                obj.Set(member.name, Napi::BigInt::New(env, v));
            } break;
            case PrimitiveKind::UInt64: {
                uint64_t v = *(uint64_t *)ptr;
                obj.Set(member.name, Napi::BigInt::New(env, v));
            } break;
            case PrimitiveKind::Float32: {
                double d = (double)*(float *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::Float64: {
                double d = *(double *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::String: {
                const char *str = *(const char **)ptr;
                obj.Set(member.name, Napi::String::New(env, str));
            } break;

            case PrimitiveKind::Record: {
                Napi::Object obj2 = PopObject(env, ptr, member.type);
                obj.Set(member.name, obj2);
            } break;

            case PrimitiveKind::Pointer: {
                void *ptr2 = *(void **)ptr;
                obj.Set(member.name, Napi::External<void>::New(env, ptr2));
            } break;
        }

        ptr += member.type->size;
    }

    return obj;
}

#if defined(_WIN64)

extern "C" uint64_t ForwardCall(const void *func, uint8_t *sp);
extern "C" float ForwardCallF(const void *func, uint8_t *sp);
extern "C" double ForwardCallD(const void *func, uint8_t *sp);
extern "C" uint64_t ForwardCallX(const void *func, uint8_t *sp);
extern "C" float ForwardCallXF(const void *func, uint8_t *sp);
extern "C" double ForwardCallXD(const void *func, uint8_t *sp);

Napi::Value TranslateCall(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    FunctionInfo *func = (FunctionInfo *)info.Data();
    LibraryData *lib = func->lib.get();

    lib->stack.len = 0;
    lib->stack.SetCapacity(Mebibytes(2));
    lib->stack.len = lib->stack.capacity;
    RG_DEFER { lib->tmp_alloc.ReleaseAll(); };

    RG_ASSERT(AlignUp(lib->stack.ptr, 16) == lib->stack.ptr);
    RG_ASSERT(AlignUp(lib->stack.end(), 16) == lib->stack.end());

    // Sanity checks
    if (info.Length() < (uint32_t)func->parameters.len) {
        Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Big objects need to be copied to be assembled in memory
    Size scratch_len = 0;
    for (const TypeInfo *param_type: func->parameters) {
        if (param_type->irregular) {
            Size aligned = AlignLen(param_type->size, 16);
            scratch_len += aligned;
        }
    }

    // Stack pointer and register
    uint8_t *top_ptr = lib->stack.end() - 64;
    uint8_t *scratch_ptr = top_ptr - scratch_len;
    uint8_t *return_ptr = nullptr;
    uint8_t *args_ptr = nullptr;
    bool use_xmm = false;

    // Reserve space for return value if needed
    if (func->return_type->irregular) {
        return_ptr = scratch_ptr - AlignLen(func->return_type->size, 16);
        args_ptr = return_ptr - 8 * AlignLen(std::max((Size)4, func->parameters.len + 1), 2);
        *(uint64_t *)args_ptr = (uint64_t)return_ptr;
    } else {
        args_ptr = scratch_ptr - 8 * AlignLen(std::max((Size)4, func->parameters.len), 2);
    }

    // Push arguments
    for (Size i = 0, j = return_ptr ? 8 : 0; i < func->parameters.len; i++, j += 8) {
        const TypeInfo *param_type = func->parameters[i];
        Napi::Value value = info[i];

        switch (param_type->primitive) {
            case PrimitiveKind::Void: { RG_UNREACHABLE(); } break;

            case PrimitiveKind::Bool: {
                if (!value.IsBoolean()) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                bool b = info[i].As<Napi::Boolean>();
                *(bool *)(args_ptr + j) = b;
            } break;
            case PrimitiveKind::Int8:
            case PrimitiveKind::UInt8:
            case PrimitiveKind::Int16:
            case PrimitiveKind::UInt16:
            case PrimitiveKind::Int32:
            case PrimitiveKind::UInt32:
            case PrimitiveKind::Int64:
            case PrimitiveKind::UInt64: {
                if (info[i].IsNumber()) {
                    int64_t v = info[i].As<Napi::Number>();
                    *(int64_t *)(args_ptr + j) = v;
                } else if (info[i].IsBigInt()) {
                    Napi::BigInt bigint = info[i].As<Napi::BigInt>();

                    bool lossless;
                    uint64_t v = bigint.Uint64Value(&lossless);

                    *(int64_t *)(args_ptr + j) = v;
                } else {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }
            } break;
            case PrimitiveKind::Float32: {
                if (info[i].IsNumber()) {
                    float f = info[i].As<Napi::Number>();
                    *(float *)(args_ptr + j) = f;
                } else if (info[i].IsBigInt()) {
                    Napi::BigInt bigint = info[i].As<Napi::BigInt>();

                    bool lossless;
                    float f = (float)bigint.Uint64Value(&lossless);

                    *(float *)(args_ptr + j) = f;
                } else {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                use_xmm = true;
            } break;
            case PrimitiveKind::Float64: {
                if (info[i].IsNumber()) {
                    double d = info[i].As<Napi::Number>();
                    *(double *)(args_ptr + j) = d;
                } else if (info[i].IsBigInt()) {
                    Napi::BigInt bigint = info[i].As<Napi::BigInt>();

                    bool lossless;
                    double d = (double)bigint.Uint64Value(&lossless);

                    *(double *)(args_ptr + j) = d;
                } else {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                use_xmm = true;
            } break;
            case PrimitiveKind::String: {
                if (!value.IsString()) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                const char *str = CopyNodeString(info[i], &lib->tmp_alloc);
                *(const char **)(args_ptr + j) = str;
            } break;

            case PrimitiveKind::Record: {
                if (!value.IsObject()) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                uint8_t *ptr;
                if (param_type->irregular) {
                    ptr = scratch_ptr;
                    *(uint8_t **)(args_ptr + j) = ptr;

                    scratch_ptr = AlignUp(scratch_ptr + param_type->size, 16);
                } else {
                    ptr = (uint8_t *)(args_ptr + j);
                }

                Napi::Object obj = info[i].As<Napi::Object>();
                if (!PushObject(obj, param_type, &lib->tmp_alloc, ptr)) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null(); \
                }

                // XXX: Don't do this unless we really need it
                use_xmm = true;
            } break;

            case PrimitiveKind::Pointer: {
                if (!value.IsExternal()) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                void *ptr = info[i].As<Napi::External<void>>();
                *(void **)(args_ptr + j) = ptr;
            } break;
        }
    }

#if 0
    PrintLn(stderr, "%!..+---- %1 ----%!0", func->name);

    PrintLn(stderr, "Parameters:");
    for (Size i = 0; i < func->parameters.len; i++) {
        PrintLn(stderr, "  %1 = %2", i, func->parameters[i]->name);
    }

    PrintLn(stderr, "Stack (%1) at 0x%2:", top_ptr - args_ptr, args_ptr);
    for (uint8_t *ptr = args_ptr; ptr < top_ptr;) {
        Print(stderr, " ");
        for (int i = 0; ptr < top_ptr && i < 8; i++, ptr++) {
            Print(stderr, " %1", FmtHex(*ptr).Pad0(-2));
        }
        PrintLn(stderr);
    }
#endif

    // Perform the call and return value
    if (func->return_type->primitive == PrimitiveKind::Float32) {
        float f = use_xmm ? ForwardCallXF(func->func, args_ptr) : ForwardCallF(func->func, args_ptr);
        return Napi::Number::New(env, (double)f);
    } else if (func->return_type->primitive == PrimitiveKind::Float64) {
        double d = use_xmm ? ForwardCallXD(func->func, args_ptr) : ForwardCallD(func->func, args_ptr);
        return Napi::Number::New(env, d);
    } else {
        uint64_t rax = use_xmm ? ForwardCallX(func->func, args_ptr) : ForwardCall(func->func, args_ptr);

        switch (func->return_type->primitive) {
            case PrimitiveKind::Void: return env.Null();
            case PrimitiveKind::Bool: return Napi::Boolean::New(env, rax);
            case PrimitiveKind::Int8: return Napi::Number::New(env, (double)rax);
            case PrimitiveKind::UInt8: return Napi::Number::New(env, (double)rax);
            case PrimitiveKind::Int16: return Napi::Number::New(env, (double)rax);
            case PrimitiveKind::UInt16: return Napi::Number::New(env, (double)rax);
            case PrimitiveKind::Int32: return Napi::Number::New(env, (double)rax);
            case PrimitiveKind::UInt32: return Napi::Number::New(env, (double)rax);
            case PrimitiveKind::Int64: return Napi::BigInt::New(env, (int64_t)rax);
            case PrimitiveKind::UInt64: return Napi::BigInt::New(env, rax);
            case PrimitiveKind::Float32: { RG_UNREACHABLE(); } break;
            case PrimitiveKind::Float64: { RG_UNREACHABLE(); } break;
            case PrimitiveKind::String: return Napi::String::New(env, (const char *)rax);

            case PrimitiveKind::Record: {
                const uint8_t *ptr = return_ptr ? return_ptr : (const uint8_t *)&rax;
                Napi::Object obj = PopObject(env, ptr, func->return_type);
                return obj;
            } break;

            case PrimitiveKind::Pointer: {
                void *ptr = (void *)rax;
                return Napi::External<void>::New(env, ptr);
            } break;
        }
    }

    RG_UNREACHABLE();
}

#else
    #error Platform not yet supported
#endif

}
