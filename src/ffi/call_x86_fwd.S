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

.global _ForwardCallG
.global _ForwardCallF
.global _ForwardCallD

// Copy function pointer to EAX, in order to save it through argument forwarding.
// Save ESP in EBX (non-volatile), and use carefully assembled stack provided by caller.
// Call native function.
// Once done, restore normal stack pointer and return.
// The return value is passed back untouched.
.macro forward
    .cfi_startproc
    .cfi_def_cfa esp, 4
    endbr32
    push %ebx
    .cfi_def_cfa esp, 8
    movd 8(%esp), %eax
    movd %esp, %ebx
    .cfi_def_cfa ebx, 8
    movd 12(%esp), esp
    call *%eax
    movd %ebx, %esp
    pop %ebx
    .cfi_def_cfa esp, 4
    ret
    .cfi_endproc
.endm

_ForwardCallG:
    forward

_ForwardCallF:
    forward

_ForwardCallD:
    forward
