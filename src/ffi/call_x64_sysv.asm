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
; Unlike the five next functions, these ones don't forward XMM argument registers.
global ForwardCallII
global ForwardCallF
global ForwardCallDI
global ForwardCallID
global ForwardCallDD

; The X variants are slightly slower, and are used when XMM arguments must be forwarded.
global ForwardCallXII
global ForwardCallXF
global ForwardCallXDI
global ForwardCallXID
global ForwardCallXDD

section .text

; Copy function pointer to RAX, in order to save it through argument forwarding.
; Save RSP in RBX (non-volatile), and use carefully assembled stack provided by caller.
%macro prologue 0
    endbr64
    mov rax, rdi
    push rbx
    mov rbx, rsp
    mov rsp, rsi
    add rsp, 112
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
    mov r9, [rsi+40]
    mov r8, [rsi+32]
    mov rcx, [rsi+24]
    mov rdx, [rsi+16]
    mov rdi, [rsi+0]
    mov rsi, [rsi+8]
%endmacro

; Prepare XMM argument registers from array passed by caller.
%macro forward_xmm 0
    movsd xmm7, [rsi+104]
    movsd xmm6, [rsi+96]
    movsd xmm5, [rsi+88]
    movsd xmm4, [rsi+80]
    movsd xmm3, [rsi+72]
    movsd xmm2, [rsi+64]
    movsd xmm1, [rsi+56]
    movsd xmm0, [rsi+48]
%endmacro

ForwardCallII:
    prologue
    forward_int
    epilogue

ForwardCallF:
    prologue
    forward_int
    epilogue

ForwardCallDI:
    prologue
    forward_int
    epilogue

ForwardCallID:
    prologue
    forward_int
    epilogue

ForwardCallDD:
    prologue
    forward_int
    epilogue

ForwardCallXII:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXF:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXDI:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXID:
    prologue
    forward_xmm
    forward_int
    epilogue

ForwardCallXDD:
    prologue
    forward_xmm
    forward_int
    epilogue
