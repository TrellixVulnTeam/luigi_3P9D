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

#include "vendor/libcc/libcc.hh"
#include "ffi.hh"
#include "util.hh"

#include <napi.h>

namespace RG {

const char *GetValueType(const InstanceData *instance, Napi::Value value)
{
    for (const TypeInfo &type: instance->types) {
        if (CheckValueTag(instance, value, &type))
            return type.name;
    }

    switch (value.Type()) {
        case napi_undefined: return "undefined";
        case napi_null: return "null";
        case napi_boolean: return "boolean";
        case napi_number: return "number";
        case napi_string: return "string";
        case napi_symbol: return "symbol";
        case napi_object: return "object";
        case napi_function: return "fucntion";
        case napi_external: return "external";
        case napi_bigint: return "bigint";
    }

    return "unknown";
}

void SetValueTag(const InstanceData *instance, Napi::Value value, const void *marker)
{
    napi_type_tag tag = { instance->tag_lower, (uint64_t)marker };
    napi_status status = napi_type_tag_object(value.Env(), value, &tag);
    RG_ASSERT(status == napi_ok);
}

bool CheckValueTag(const InstanceData *instance, Napi::Value value, const void *marker)
{
    bool match = false;

    napi_type_tag tag = { instance->tag_lower, (uint64_t)marker };
    napi_check_object_type_tag(value.Env(), value, &tag, &match);

    return match;
}

const char *CopyNodeString(const Napi::Value &value, Allocator *alloc)
{
    RG_ASSERT(value.IsString());

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

bool PushObject(const Napi::Object &obj, const TypeInfo *type, Allocator *alloc, uint8_t *dest)
{
    Napi::Env env = obj.Env();
    InstanceData *instance = env.GetInstanceData<InstanceData>();

    RG_ASSERT(obj.IsObject());
    RG_ASSERT(type->primitive == PrimitiveKind::Record);

    dest = AlignUp(dest, type->align);

    for (const RecordMember &member: type->members) {
        Napi::Value value = obj.Get(member.name);

        if (RG_UNLIKELY(value.IsUndefined())) {
            ThrowError<Napi::TypeError>(env, "Missing expected object property '%1'", member.name);
            return false;
        }

        dest = AlignUp(dest, member.type->align);

        switch (member.type->primitive) {
            case PrimitiveKind::Void: { RG_UNREACHABLE(); } break;

            case PrimitiveKind::Bool: {
                if (RG_UNLIKELY(!value.IsBoolean())) {
                    ThrowError<Napi::TypeError>(env, "Unexpected value %1 for member '%2', expected boolean", GetValueType(instance, value), member.name);
                    return false;
                }

                bool b = value.As<Napi::Boolean>();
                *(bool *)dest = b;
            } break;

            case PrimitiveKind::Int8:
            case PrimitiveKind::UInt8:
            case PrimitiveKind::Int16:
            case PrimitiveKind::UInt16:
            case PrimitiveKind::Int32:
            case PrimitiveKind::UInt32:
            case PrimitiveKind::Int64:
            case PrimitiveKind::UInt64: {
                if (RG_UNLIKELY(!value.IsNumber() && !value.IsBigInt())) {
                    ThrowError<Napi::TypeError>(env, "Unexpected value %1 for member '%2', expected number", GetValueType(instance, value), member.name);
                    return false;
                }

                int64_t v = CopyNodeNumber<int64_t>(value);
                memcpy(dest, &v, member.type->size); // Little Endian
            } break;
            case PrimitiveKind::Float32: {
                if (RG_UNLIKELY(!value.IsNumber() && !value.IsBigInt())) {
                    ThrowError<Napi::TypeError>(env, "Unexpected value %1 for member '%2', expected number", GetValueType(instance, value), member.name);
                    return false;
                }

                float f = CopyNodeNumber<float>(value);
                memcpy(dest, &f, 4);
            } break;
            case PrimitiveKind::Float64: {
                if (RG_UNLIKELY(!value.IsNumber() && !value.IsBigInt())) {
                    ThrowError<Napi::TypeError>(env, "Unexpected value %1 for member '%2', expected number", GetValueType(instance, value), member.name);
                    return false;
                }

                double d = CopyNodeNumber<double>(value);
                memcpy(dest, &d, 8);
            } break;
            case PrimitiveKind::String: {
                if (RG_UNLIKELY(!value.IsString())) {
                    ThrowError<Napi::TypeError>(env, "Unexpected value %1 for member '%2', expected string", GetValueType(instance, value), member.name);
                    return false;
                }

                const char *str = CopyNodeString(value, alloc);
                *(const char **)dest = str;
            } break;
            case PrimitiveKind::Pointer: {
                if (RG_UNLIKELY(!CheckValueTag(instance, value, member.type))) {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value for member '%2', expected %3", GetValueType(instance, value), member.name, member.type->name);
                    return false;
                }

                Napi::External external = value.As<Napi::External<void>>();
                void *ptr = external.Data();
                *(void **)dest = ptr;
            } break;

            case PrimitiveKind::Record: {
                if (RG_UNLIKELY(!value.IsObject())) {
                    ThrowError<Napi::TypeError>(env, "Unexpected value %1 for member '%2', expected object", GetValueType(instance, value), member.name);
                    return false;
                }

                Napi::Object obj = value.As<Napi::Object>();
                if (!PushObject(obj, member.type, alloc, dest))
                    return false;
            } break;
        }

        dest += member.type->size;
    }

    return true;
}

Napi::Object PopObject(Napi::Env env, const uint8_t *ptr, const TypeInfo *type)
{
    InstanceData *instance = env.GetInstanceData<InstanceData>();

    RG_ASSERT(type->primitive == PrimitiveKind::Record);

    Napi::Object obj = Napi::Object::New(env);

    ptr = AlignUp(ptr, type->align);

    for (const RecordMember &member: type->members) {
        ptr = AlignUp(ptr, member.type->align);

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
                float f;
                memcpy(&f, ptr, 4);
                obj.Set(member.name, Napi::Number::New(env, (double)f));
            } break;
            case PrimitiveKind::Float64: {
                double d;
                memcpy(&d, ptr, 8);
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::String: {
                const char *str = *(const char **)ptr;
                obj.Set(member.name, Napi::String::New(env, str));
            } break;
            case PrimitiveKind::Pointer: {
                void *ptr2 = *(void **)ptr;

                Napi::External<void> external = Napi::External<void>::New(env, ptr2);
                SetValueTag(instance, external, member.type);

                obj.Set(member.name, external);
            } break;

            case PrimitiveKind::Record: {
                Napi::Object obj2 = PopObject(env, ptr, member.type);
                obj.Set(member.name, obj2);
            } break;
        }

        ptr += member.type->size;
    }

    return obj;
}

void DumpStack(const FunctionInfo *func, Span<const uint8_t> sp)
{
    PrintLn(stderr, "%!..+---- %1 ----%!0", func->name);

    PrintLn(stderr, "Parameters:");
    for (Size i = 0; i < func->parameters.len; i++) {
        const ParameterInfo &param = func->parameters[i];
        PrintLn(stderr, "  %1 = %2", i, param.type->name);
    }

    PrintLn(stderr, "Stack (%1 bytes) at 0x%2:", sp.len, sp.ptr);
    for (const uint8_t *ptr = sp.begin(); ptr < sp.end();) {
        Print(stderr, "  [0x%1 %2 %3]  ", FmtArg(ptr).Pad0(-16), FmtArg((ptr - sp.begin()) / 8).Pad(-4),
                                                                 FmtArg(ptr - sp.begin()).Pad(-4));
        for (int i = 0; ptr < sp.end() && i < 8; i++, ptr++) {
            Print(stderr, " %1", FmtHex(*ptr).Pad0(-2));
        }
        PrintLn(stderr);
    }
}

}