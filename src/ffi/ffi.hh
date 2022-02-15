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

enum class PrimitiveKind {
    Void,
    Bool,
    Int8,
    UInt8,
    Int16,
    UInt16,
    Int32,
    UInt32,
    Int64,
    UInt64,
    Float32,
    Float64,
    String,
    Record,
    Pointer
};

struct TypeInfo;
struct RecordMember;
struct FunctionInfo;

struct TypeInfo {
    const char *name;

    PrimitiveKind primitive;
    int16_t size;
    int16_t align;

    HeapArray<RecordMember> members; // Record only
    const TypeInfo *ref; // Pointer only

    RG_HASHTABLE_HANDLER(TypeInfo, name);
};

struct RecordMember {
    const char *name;
    const TypeInfo *type;
};

class LibraryData {
public:
    ~LibraryData();

    void *module = nullptr; // HMODULE on Windows

    BlockAllocator tmp_alloc;
    LocalArray<uint8_t, Mebibytes(1), 16> stack;

    BlockAllocator str_alloc;
};

struct ParameterInfo {
    const TypeInfo *type;

    // ABI-specific part

#if defined(_WIN64)
    bool regular;
#elif defined(__x86_64__)
    int8_t gpr_count;
    int8_t xmm_count;
    bool gpr_first;
#endif
};

struct FunctionInfo {
    const char *name;
    std::shared_ptr<LibraryData> lib;

    void *func;

    ParameterInfo ret;
    HeapArray<ParameterInfo> parameters;

    Size args_size;
    Size irregular_size;
};

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

}
