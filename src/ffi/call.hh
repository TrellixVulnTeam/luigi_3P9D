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

struct TypeInfo;
struct FunctionInfo;

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

bool PushObject(const Napi::Object &obj, const TypeInfo *type, Allocator *alloc, uint8_t *dest);
Napi::Object PopObject(napi_env env, const uint8_t *ptr, const TypeInfo *type);

void DumpStack(const FunctionInfo *func, Span<const uint8_t> sp);

// ABI specific

bool AnalyseFunction(FunctionInfo *func);
Napi::Value TranslateCall(const Napi::CallbackInfo &info);

}
