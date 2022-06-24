Luiggi |version|
================

Overview
--------

Luiggi is an educational toy programming language implemented in JS, with four main goals:

- Show a simple and relatively efficient implementation of a programming language:
  - Simple lexer (tokenizer) implemented directly in JS.
  - Simple parser and bytecode compiler (without any intermediate AST).
  - Simple virtual machine, reusing JS data structures.
- Use a simple syntax reminescent of Python and BASIC, with minimal overhead.
- Provide a ready-to-use standard library with everything needed to implement simple 2D games (based on Raylib).
- Easy to use compilation to desktop (Windows, Linux, macOS) and web-ready WASM binaries, by packing the bytecode interpreter and user code.

The language uses dynamic typing for implementation simplicity.

Table of contents
-----------------

.. toctree::
   :maxdepth: 2

   start
   syntax
   values
   library
   contribute

License
-------

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License** as published by the Free Software Foundation, either **version 3 of the License**, or (at your option) any later version.

Find more information here: https://www.gnu.org/licenses/
