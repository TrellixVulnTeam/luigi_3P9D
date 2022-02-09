; This program is free software: you can redistribute it and/or modify
; it under the terms of the GNU Affero General Public License as published by
; the Free Software Foundation, either version 3 of the License, or
; (at your option) any later version.
;
; This program is distributed in the hope that it will be useful,
; but WITHOUT ANY WARRANTY; without even the implied warranty of
; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
; GNU Affero General Public License for more details.
;
; You should have received a copy of the GNU Affero General Public License
; along with this program. If not, see https://www.gnu.org/licenses/.

; These three are the same, but they differ (in the C side) by their return type.
; Unlike the three next functions, these ones don't forward XMM argument registers.
global ForwardCall
global ForwardCallF
global ForwardCallD

; The X variants are slightly slower, and are used when XMM arguments must be forwarded.
global ForwardCallX
global ForwardCallXF
global ForwardCallXD

section .text

; Copy function pointer to RAX, in order to save it through argument forwarding.
; Save RSP in RBX (non-volatile), and use carefully assembled stack provided by caller.
%macro prologue 0
    mov rax, rcx
    push rbx
    mov rbx, rsp
    mov rsp, rdx
%endmacro

; Call native function.
; Once done, restore normal stack pointer and return.
; The return value is passed untouched through RAX or XMM0.
%macro epilogue 0
    call rax
    mov rsp, rbx
    pop rbx
    ret
%endmacro

; Prepare integer argument registers from array passed by caller.
%macro forward_int 0
    mov r9, [rdx+24]
    mov r8, [rdx+16]
    mov rcx, [rdx+0]
    mov rdx, [rdx+8]
%endmacro

; Prepare XMM argument registers from array passed by caller.
%macro forward_xmm 0
    movsd xmm3, [rdx+24]
    movsd xmm2, [rdx+16]
    movsd xmm1, [rdx+8]
    movsd xmm0, [rdx+0]
%endmacro

ForwardCall:
    prologue
    forward_int
    epilogue

ForwardCallF:
    prologue
    forward_int
    epilogue

ForwardCallD:
    prologue
    forward_int
    epilogue

ForwardCallX:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXF:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXD:
    prologue
    forward_xmm
    forward_int
    epilogue
