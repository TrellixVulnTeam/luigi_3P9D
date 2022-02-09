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

namespace RG {

#if defined(_WIN64) // Win64 ABI

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
    const TypeInfo *return_type = func->return_type;

    lib->stack.len = 0;
    lib->stack.SetCapacity(Mebibytes(2));
    lib->stack.len = lib->stack.capacity;
    RG_DEFER { lib->tmp_alloc.ReleaseAll(); };

    // Sanity checks
    if (info.Length() < (uint32_t)func->parameters.len) {
        Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Stack pointer and register
    uint8_t *top_ptr = lib->stack.end();
    uint8_t *scratch_ptr = top_ptr - func->irregular_size;
    uint8_t *return_ptr = nullptr;
    uint8_t *args_ptr = nullptr;
    bool use_xmm = false;

    // Reserve space for return value if needed
    if (return_type->is_regular) {
        args_ptr = scratch_ptr - AlignLen(8 * std::max((Size)4, func->parameters.len), 16);
    } else {
        return_ptr = scratch_ptr - AlignLen(return_type->size, 16);
        args_ptr = return_ptr - AlignLen(8 * std::max((Size)4, func->parameters.len + 1), 16);
        *(uint64_t *)args_ptr = (uint64_t)return_ptr;
    }

    RG_ASSERT(AlignUp(lib->stack.ptr, 16) == lib->stack.ptr);
    RG_ASSERT(AlignUp(lib->stack.end(), 16) == lib->stack.end());
    RG_ASSERT(AlignUp(args_ptr, 16) == args_ptr);

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
                    uint64_t v = (uint64_t)info[i].As<Napi::Number>().Int64Value();;
                    *(uint64_t *)(args_ptr + j) = v;
                } else if (info[i].IsBigInt()) {
                    Napi::BigInt bigint = info[i].As<Napi::BigInt>();

                    bool lossless;
                    uint64_t v = bigint.Uint64Value(&lossless);

                    *(uint64_t *)(args_ptr + j) = v;
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
                if (param_type->is_regular) {
                    ptr = (uint8_t *)(args_ptr + j);
                } else {
                    ptr = scratch_ptr;
                    *(uint8_t **)(args_ptr + j) = ptr;

                    scratch_ptr = AlignUp(scratch_ptr + param_type->size, 16);
                }

                Napi::Object obj = info[i].As<Napi::Object>();
                if (!PushObject(obj, param_type, &lib->tmp_alloc, ptr)) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }
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

    // DumpStack(func, MakeSpan(args_ptr, top_ptr - args_ptr));

    // Execute and convert return value
    switch (return_type->primitive) {
        case PrimitiveKind::Float32: {
            float f = use_xmm ? ForwardCallXF(func->func, args_ptr)
                              : ForwardCallF(func->func, args_ptr);
            return Napi::Number::New(env, (double)f);
        } break;

        case PrimitiveKind::Float64: {
            double d = use_xmm ? ForwardCallXD(func->func, args_ptr)
                               : ForwardCallD(func->func, args_ptr);
            return Napi::Number::New(env, d);
        } break;

        default: {
            uint64_t rax = use_xmm ? ForwardCallX(func->func, args_ptr)
                                   : ForwardCall(func->func, args_ptr);

            switch (return_type->primitive) {
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
                    Napi::Object obj = PopObject(env, ptr, return_type);
                    return obj;
                } break;

                case PrimitiveKind::Pointer: {
                    void *ptr = (void *)rax;
                    return Napi::External<void>::New(env, ptr);
                } break;
            }
        } break;
    }

    RG_UNREACHABLE();
}

#elif defined(__x86_64__) // System V x64 ABI

struct RaxRdxRet {
    uint64_t rax;
    uint64_t rdx;
};
struct RaxXmm0Ret {
    uint64_t rax;
    double xmm0;
};
struct Xmm0RaxRet {
    double xmm0;
    uint64_t rax;
};
struct Xmm0Xmm1Ret {
    double xmm0;
    double xmm1;
};

extern "C" RaxRdxRet ForwardCallII(const void *func, uint8_t *sp);
extern "C" float ForwardCallF(const void *func, uint8_t *sp);
extern "C" Xmm0RaxRet ForwardCallFI(const void *func, uint8_t *sp);
extern "C" RaxXmm0Ret ForwardCallIF(const void *func, uint8_t *sp);
extern "C" Xmm0Xmm1Ret ForwardCallFF(const void *func, uint8_t *sp);

extern "C" RaxRdxRet ForwardCallXII(const void *func, uint8_t *sp);
extern "C" float ForwardCallXF(const void *func, uint8_t *sp);
extern "C" Xmm0RaxRet ForwardCallXFI(const void *func, uint8_t *sp);
extern "C" RaxXmm0Ret ForwardCallXIF(const void *func, uint8_t *sp);
extern "C" Xmm0Xmm1Ret ForwardCallXFF(const void *func, uint8_t *sp);

Napi::Value TranslateCall(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    FunctionInfo *func = (FunctionInfo *)info.Data();
    LibraryData *lib = func->lib.get();
    const TypeInfo *return_type = func->return_type;

    lib->stack.len = 0;
    lib->stack.SetCapacity(Mebibytes(2));
    lib->stack.len = lib->stack.capacity;
    RG_DEFER { lib->tmp_alloc.ReleaseAll(); };

    // Sanity checks
    if (info.Length() < (uint32_t)func->parameters.len) {
        Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Stack pointer and register
    uint8_t *top_ptr = lib->stack.end();
    uint8_t *return_ptr = nullptr;
    uint8_t *args_ptr = nullptr;
    uint64_t *int_ptr = nullptr, *xmm_ptr = nullptr;
    int int_count = 0, xmm_count = 0;
    bool use_xmm = false;

    // Reserve space for return value if needed
    if (return_type->size <= 16) {
        args_ptr = top_ptr - func->args_size;
        xmm_ptr = (uint64_t *)args_ptr - 8;
        int_ptr = xmm_ptr - 6;

#ifndef NDEBUG
        memset(int_ptr, 0, top_ptr - (uint8_t *)int_ptr);
#endif
    } else {
        return_ptr = top_ptr - AlignLen(return_type->size, 16);

        args_ptr = return_ptr - func->args_size;
        xmm_ptr = (uint64_t *)args_ptr - 8;
        int_ptr = xmm_ptr - 6;

#ifndef NDEBUG
        memset(int_ptr, 0, top_ptr - (uint8_t *)int_ptr);
#endif
        int_ptr[int_count++] = (uint64_t)return_ptr;
    }

    RG_ASSERT(AlignUp(lib->stack.ptr, 16) == lib->stack.ptr);
    RG_ASSERT(AlignUp(lib->stack.end(), 16) == lib->stack.end());
    RG_ASSERT(AlignUp(args_ptr, 16) == args_ptr);

    // Push arguments
    for (Size i = 0; i < func->parameters.len; i++) {
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

                if (RG_LIKELY(int_count < 8)) {
                    int_ptr[int_count++] = (uint64_t)b;
                } else {
                    *args_ptr = (uint8_t)b;
                    args_ptr += 1;
                }
            } break;
            case PrimitiveKind::Int8:
            case PrimitiveKind::UInt8:
            case PrimitiveKind::Int16:
            case PrimitiveKind::UInt16:
            case PrimitiveKind::Int32:
            case PrimitiveKind::UInt32:
            case PrimitiveKind::Int64:
            case PrimitiveKind::UInt64: {
                uint64_t v;
                if (info[i].IsNumber()) {
                    v = (uint64_t)info[i].As<Napi::Number>().Int64Value();
                } else if (info[i].IsBigInt()) {
                    Napi::BigInt bigint = info[i].As<Napi::BigInt>();

                    bool lossless;
                    v = bigint.Uint64Value(&lossless);
                } else {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                if (RG_LIKELY(int_count < 8)) {
                    int_ptr[int_count++] = v;
                } else {
                    args_ptr = AlignUp(args_ptr, param_type->size);
                    memcpy(args_ptr, &v, param_type->size); // Little Endian
                    args_ptr += param_type->size;
                }
            } break;
            case PrimitiveKind::Float32: {
                float f;
                if (info[i].IsNumber()) {
                    f = info[i].As<Napi::Number>();
                } else if (info[i].IsBigInt()) {
                    Napi::BigInt bigint = info[i].As<Napi::BigInt>();

                    bool lossless;
                    f = (float)bigint.Uint64Value(&lossless);
                } else {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                if (RG_LIKELY(xmm_count < 6)) {
                    memcpy(xmm_ptr + xmm_count++, &f, 4);
                } else {
                    args_ptr = AlignUp(args_ptr, 4);
                    memcpy(args_ptr, &f, 4);
                    args_ptr += 4;
                }
            } break;
            case PrimitiveKind::Float64: {
                double d;
                if (info[i].IsNumber()) {
                    d = info[i].As<Napi::Number>();
                } else if (info[i].IsBigInt()) {
                    Napi::BigInt bigint = info[i].As<Napi::BigInt>();

                    bool lossless;
                    d = (double)bigint.Uint64Value(&lossless);
                } else {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                if (RG_LIKELY(xmm_count < 6)) {
                    memcpy(args_ptr + xmm_count++, &d, 8);
                } else {
                    args_ptr = AlignUp(args_ptr, 8);
                    memcpy(args_ptr, &d, 8);
                    args_ptr += 8;
                }
            } break;
            case PrimitiveKind::String: {
                if (!value.IsString()) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                const char *str = CopyNodeString(info[i], &lib->tmp_alloc);

                if (RG_LIKELY(int_count < 8)) {
                    int_ptr[int_count++] = (uint64_t)str;
                } else {
                    args_ptr = AlignUp(args_ptr, 8);
                    *(uint64_t *)args_ptr = (uint64_t)str;
                    args_ptr += 8;
                }
            } break;

            case PrimitiveKind::Record: {
                if (!value.IsObject()) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                uint8_t *ptr;
                if (param_type->is_small && !param_type->all_fp && int_count < 6) {
                    ptr = (uint8_t *)(int_ptr + int_count++);
                } else if (param_type->is_small && param_type->all_fp && xmm_count < 8) {
                    ptr = (uint8_t *)(xmm_ptr + xmm_count++);
                } else {
                    // XXX: args_ptr = AlignUp(args_ptr, param_type->alignment);
                    ptr = args_ptr;
                    args_ptr += param_type->size;
                }

                Napi::Object obj = info[i].As<Napi::Object>();
                if (!PushObject(obj, param_type, &lib->tmp_alloc, ptr)) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }
            } break;

            case PrimitiveKind::Pointer: {
                if (!value.IsExternal()) {
                    Napi::TypeError::New(env, "Unexpected value type").ThrowAsJavaScriptException();
                    return env.Null();
                }

                void *ptr = info[i].As<Napi::External<void>>();

                if (RG_LIKELY(int_count < 8)) {
                    int_ptr[int_count++] = (uint64_t)ptr;
                } else {
                    args_ptr = AlignUp(args_ptr, 8);
                    *(uint64_t *)args_ptr = (uint64_t)ptr;
                    args_ptr += 8;
                }
            } break;
        }

        use_xmm |= param_type->has_fp;
    }

    // DumpStack(func, MakeSpan((uint8_t *)int_ptr, top_ptr - (uint8_t *)int_ptr));

    // Execute and convert return value
    switch (return_type->primitive) {
        case PrimitiveKind::Float32: {
            float f = use_xmm ? ForwardCallXF(func->func, (uint8_t *)int_ptr) 
                              : ForwardCallF(func->func, (uint8_t *)int_ptr);
            return Napi::Number::New(env, (double)f);
        } break;

        case PrimitiveKind::Float64: {
            double d = use_xmm ? ForwardCallXD(func->func, (uint8_t *)int_ptr)
                               : ForwardCallD(func->func, (uint8_t *)int_ptr);

            return Napi::Number::New(env, d);
        } break;

        case PrimitiveKind::Record: {
            RaxRdxRet ret = use_xmm ? ForwardCallXII(func->func, (uint8_t *)int_ptr)
                                    : ForwardCallII(func->func, (uint8_t *)int_ptr);

            const uint8_t *ptr = return_ptr ? return_ptr : (const uint8_t *)&ret;
            Napi::Object obj = PopObject(env, ptr, return_type);
            return obj;
        } break;

        default: {
            RaxRdxRet ret = use_xmm ? ForwardCallXII(func->func, (uint8_t *)int_ptr)
                                    : ForwardCallII(func->func, (uint8_t *)int_ptr);

            switch (return_type->primitive) {
                case PrimitiveKind::Void: return env.Null();
                case PrimitiveKind::Bool: return Napi::Boolean::New(env, ret.rax);
                case PrimitiveKind::Int8: return Napi::Number::New(env, (double)ret.rax);
                case PrimitiveKind::UInt8: return Napi::Number::New(env, (double)ret.rax);
                case PrimitiveKind::Int16: return Napi::Number::New(env, (double)ret.rax);
                case PrimitiveKind::UInt16: return Napi::Number::New(env, (double)ret.rax);
                case PrimitiveKind::Int32: return Napi::Number::New(env, (double)ret.rax);
                case PrimitiveKind::UInt32: return Napi::Number::New(env, (double)ret.rax);
                case PrimitiveKind::Int64: return Napi::BigInt::New(env, (int64_t)ret.rax);
                case PrimitiveKind::UInt64: return Napi::BigInt::New(env, ret.rax);
                case PrimitiveKind::Float32: { RG_UNREACHABLE(); } break;
                case PrimitiveKind::Float64: { RG_UNREACHABLE(); } break;
                case PrimitiveKind::String: return Napi::String::New(env, (const char *)ret.rax);

                case PrimitiveKind::Record: { RG_UNREACHABLE(); } break;

                case PrimitiveKind::Pointer: {
                    void *ptr = (void *)ret.rax;
                    return Napi::External<void>::New(env, ptr);
                } break;
            }
        } break;
    }

    RG_UNREACHABLE();
}

#endif

}
