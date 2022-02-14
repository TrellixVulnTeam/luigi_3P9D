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

#ifdef _WIN64

#include "libcc.hh"
#include "ffi.hh"
#include "call.hh"

#include <napi.h>

namespace RG {

extern "C" uint64_t ForwardCallG(const void *func, uint8_t *sp);
extern "C" float ForwardCallF(const void *func, uint8_t *sp);
extern "C" double ForwardCallD(const void *func, uint8_t *sp);
extern "C" uint64_t ForwardCallXG(const void *func, uint8_t *sp);
extern "C" float ForwardCallXF(const void *func, uint8_t *sp);
extern "C" double ForwardCallXD(const void *func, uint8_t *sp);

static inline bool IsRegular(Size size)
{
    bool regular = (size <= 8 && !(size & (size - 1)));
    return regular;
}

bool AnalyseFunction(FunctionInfo *func)
{
    func->ret.regular = IsRegular(func->ret.type->size);

    for (ParameterInfo &param: func->parameters) {
        param.regular = IsRegular(param.type->size);
    }

    return true;
}

Napi::Value TranslateCall(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    FunctionInfo *func = (FunctionInfo *)info.Data();
    LibraryData *lib = func->lib.get();

    lib->stack.len = 0;
    lib->stack.SetCapacity(Mebibytes(2));
    lib->stack.len = lib->stack.capacity;
    RG_DEFER { lib->tmp_alloc.ReleaseAll(); };

    // Sanity checks
    if (info.Length() < (uint32_t)func->parameters.len) {
        ThrowError<Napi::TypeError>(env, "Expected %1 arguments, got %2", func->parameters.len, info.Length());
        return env.Null();
    }

    // Stack pointer and register
    uint8_t *top_ptr = lib->stack.end();
    uint8_t *scratch_ptr = top_ptr - func->irregular_size;
    uint8_t *return_ptr = nullptr;
    uint8_t *args_ptr = nullptr;
    bool forward_xmm = false;

    // Reserve space for return value if needed
    if (func->ret.regular) {
        args_ptr = scratch_ptr - AlignLen(8 * std::max((Size)4, func->parameters.len), 16);
    } else {
        return_ptr = scratch_ptr - AlignLen(func->ret.type->size, 16);
        args_ptr = return_ptr - AlignLen(8 * std::max((Size)4, func->parameters.len + 1), 16);
        *(uint64_t *)args_ptr = (uint64_t)return_ptr;
    }

    RG_ASSERT(AlignUp(lib->stack.ptr, 16) == lib->stack.ptr);
    RG_ASSERT(AlignUp(lib->stack.end(), 16) == lib->stack.end());
    RG_ASSERT(AlignUp(args_ptr, 16) == args_ptr);

    // Push arguments
    for (Size i = 0, j = return_ptr ? 8 : 0; i < func->parameters.len; i++, j += 8) {
        const ParameterInfo &param = func->parameters[i];
        Napi::Value value = info[i];

        switch (param.type->primitive) {
            case PrimitiveKind::Void: { RG_UNREACHABLE(); } break;

            case PrimitiveKind::Bool: {
                if (!value.IsBoolean()) {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value for argument %2, expected boolean", GetTypeName(value.Type()), i);
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
                    uint64_t v = (uint64_t)info[i].As<Napi::Number>().Int64Value();
                    *(uint64_t *)(args_ptr + j) = v;
                } else if (info[i].IsBigInt()) {
                    Napi::BigInt bigint = info[i].As<Napi::BigInt>();

                    bool lossless;
                    uint64_t v = bigint.Uint64Value(&lossless);

                    *(uint64_t *)(args_ptr + j) = v;
                } else {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value for argument %2, expected number", GetTypeName(value.Type()), i);
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
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value for argument %2, expected number", GetTypeName(value.Type()), i);
                    return env.Null();
                }

                forward_xmm = true;
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
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value for argument %2, expected number", GetTypeName(value.Type()), i);
                    return env.Null();
                }

                forward_xmm = true;
            } break;
            case PrimitiveKind::String: {
                if (!value.IsString()) {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value for argument %2, expected string", GetTypeName(value.Type()), i);
                    return env.Null();
                }

                const char *str = CopyNodeString(info[i], &lib->tmp_alloc);
                *(const char **)(args_ptr + j) = str;
            } break;

            case PrimitiveKind::Record: {
                if (!value.IsObject()) {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value for argument %2, expected object", GetTypeName(value.Type()), i);
                    return env.Null();
                }

                uint8_t *ptr;
                if (param.regular) {
                    ptr = (uint8_t *)(args_ptr + j);
                } else {
                    ptr = scratch_ptr;
                    *(uint8_t **)(args_ptr + j) = ptr;

                    scratch_ptr = AlignUp(scratch_ptr + param.type->size, 16);
                }

                Napi::Object obj = info[i].As<Napi::Object>();
                if (!PushObject(obj, param.type, &lib->tmp_alloc, ptr))
                    return env.Null();
            } break;

            case PrimitiveKind::Pointer: {
                if (!value.IsExternal()) {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value for argument %2, expected external", GetTypeName(value.Type()), i);
                    return env.Null();
                }

                void *ptr = info[i].As<Napi::External<void>>();
                *(void **)(args_ptr + j) = ptr;
            } break;
        }
    }

    // DumpStack(func, MakeSpan(args_ptr, top_ptr - args_ptr));

#define PERFORM_CALL(Suffix) \
        (forward_xmm ? ForwardCallX ## Suffix(func->func, args_ptr) \
                     : ForwardCall ## Suffix(func->func, args_ptr))

    // Execute and convert return value
    switch (func->ret.type->primitive) {
        case PrimitiveKind::Float32: {
            float f = PERFORM_CALL(F);

            return Napi::Number::New(env, (double)f);
        } break;

        case PrimitiveKind::Float64: {
            double d = PERFORM_CALL(D);

            return Napi::Number::New(env, d);
        } break;

        default: {
            uint64_t rax = PERFORM_CALL(G);

            switch (func->ret.type->primitive) {
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
                    Napi::Object obj = PopObject(env, ptr, func->ret.type);
                    return obj;
                } break;

                case PrimitiveKind::Pointer: {
                    void *ptr = (void *)rax;
                    return Napi::External<void>::New(env, ptr);
                } break;
            }
        } break;
    }

#undef PERFORM_CALL

    RG_UNREACHABLE();
}

}

#endif
