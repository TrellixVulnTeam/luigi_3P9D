// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see https://www.gnu.org/licenses/.

// These five are the same, but they differ (in the C side) by their return type.
// Unlike the five next functions, these ones don't forward XMM argument registers.
.global ForwardCallGG
.global ForwardCallF
.global ForwardCallDG
.global ForwardCallGD
.global ForwardCallDD

// The X variants are slightly slower, and are used when XMM arguments must be forwarded.
.global ForwardCallXGG
.global ForwardCallXF
.global ForwardCallXDG
.global ForwardCallXGD
.global ForwardCallXDD

// Copy function pointer to r9, in order to save it through argument forwarding.
// Save RSP in r19 (non-volatile), and use carefully assembled stack provided by caller.
.macro prologue
    .cfi_startproc
    mov x9, x0
    sub sp, sp, #16
    .cfi_def_cfa sp, 16
    str x19, [sp]
    mov x19, sp
    .cfi_def_cfa x19, 16
    mov sp, x1
    add sp, sp, #128
.endm

// Call native function.
// Once done, restore normal stack pointer and return.
// The return value is passed untouched through r0, r1, v0 and/or v1.
.macro epilogue
    blr x9
    mov sp, x19
    ldr x19, [sp]
    ret
    .cfi_endproc
.endm

// Prepare general purpose argument registers from array passed by caller.
.macro forward_int
    ldr x7, [x1, 56]
    ldr x6, [x1, 48]
    ldr x5, [x1, 40]
    ldr x4, [x1, 32]
    ldr x3, [x1, 24]
    ldr x2, [x1, 16]
    ldr x0, [x1, 0]
    ldr x1, [x1, 8]
.endm

// Prepare vector argument registers from array passed by caller.
.macro forward_xmm
    add x10, x1, #64
    ld1 {v0.8b, v1.8b, v2.8b, v3.8b}, [x10], #32
    ld1 {v4.8b, v5.8b, v6.8b, v7.8b}, [x10]
.endm

ForwardCallGG:
    prologue
    forward_int
    epilogue

ForwardCallF:
    prologue
    forward_int
    epilogue

ForwardCallDG:
    prologue
    forward_int
    epilogue

ForwardCallGD:
    prologue
    forward_int
    epilogue

ForwardCallDD:
    prologue
    forward_int
    epilogue

ForwardCallXGG:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXF:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXDG:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXGD:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXDD:
    prologue
    forward_xmm
    forward_int
    epilogue
