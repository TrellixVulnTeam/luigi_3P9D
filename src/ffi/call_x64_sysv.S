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
.global ForwardCallII
.global ForwardCallF
.global ForwardCallDI
.global ForwardCallID
.global ForwardCallDD

// The X variants are slightly slower, and are used when XMM arguments must be forwarded.
.global ForwardCallXII
.global ForwardCallXF
.global ForwardCallXDI
.global ForwardCallXID
.global ForwardCallXDD

// Copy function pointer to RAX, in order to save it through argument forwarding.
// Save RSP in RBX (non-volatile), and use carefully assembled stack provided by caller.
#define PROLOGUE \
    endbr64 ; \
    movq %rdi, %rax ; \
    pushq %rbx ; \
    movq %rsp, %rbx ; \
    movq %rsi, %rsp ; \
    addq $112, %rsp

// Call native function.
// Once done, restore normal stack pointer and return.
// The return value is passed untouched through RAX or XMM0.
#define EPILOGUE \
    call *%rax ; \
    movq %rbx, %rsp ; \
    popq %rbx ; \
    ret

// Prepare integer argument registers from array passed by caller.
#define FORWARD_INT \
    movq 40(%rsi), %r9 ; \
    movq 32(%rsi), %r8 ; \
    movq 24(%rsi), %rcx ; \
    movq 16(%rsi), %rdx ; \
    movq 0(%rsi), %rdi ; \
    movq 8(%rsi), %rsi

// Prepare XMM argument registers from array passed by caller.
#define FORWARD_XMM \
    movsd 104(%rsi), %xmm7 ; \
    movsd 96(%rsi), %xmm6 ; \
    movsd 88(%rsi), %xmm5 ; \
    movsd 80(%rsi), %xmm4 ; \
    movsd 72(%rsi), %xmm3 ; \
    movsd 64(%rsi), %xmm2 ; \
    movsd 56(%rsi), %xmm1 ; \
    movsd 48(%rsi), %xmm0

ForwardCallII:
    PROLOGUE
    FORWARD_INT
    EPILOGUE

ForwardCallF:
    PROLOGUE
    FORWARD_INT
    EPILOGUE

ForwardCallDI:
    PROLOGUE
    FORWARD_INT
    EPILOGUE

ForwardCallID:
    PROLOGUE
    FORWARD_INT
    EPILOGUE

ForwardCallDD:
    PROLOGUE
    FORWARD_INT
    EPILOGUE

ForwardCallXII:
    PROLOGUE
    FORWARD_XMM
    FORWARD_INT
    EPILOGUE

ForwardCallXF:
    PROLOGUE
    FORWARD_XMM
    FORWARD_INT
    EPILOGUE

ForwardCallXDI:
    PROLOGUE
    FORWARD_XMM
    FORWARD_INT
    EPILOGUE

ForwardCallXID:
    PROLOGUE
    FORWARD_XMM
    FORWARD_INT
    EPILOGUE

ForwardCallXDD:
    PROLOGUE
    FORWARD_XMM
    FORWARD_INT
    EPILOGUE
