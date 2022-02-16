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

#pragma once

#include "libcc.hh"

#include <napi.h>

namespace RG {

template <typename T, typename... Args>
static void ThrowError(Napi::Env env, const char *msg, Args... args)
{
    char buf[1024];
    Fmt(buf, msg, args...);

    T::New(env, buf).ThrowAsJavaScriptException();
}

static inline const char *GetTypeName(napi_valuetype type)
{
    switch (type) {
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

template <typename T>
bool CopyNodeNumber(const Napi::Value &value, T *out_value)
{
    if (value.IsNumber()) {
        *out_value = (T)value.As<Napi::Number>();
        return true;
    } else if (value.IsBigInt()) {
        Napi::BigInt bigint = value.As<Napi::BigInt>();

        bool lossless;
        *out_value = (T)bigint.Uint64Value(&lossless);

        return true;
    } else {
        Napi::Env env = value.Env();

        ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetTypeName(value.Type()));
        return false;
    }
}

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

}
