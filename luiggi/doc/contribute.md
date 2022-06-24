# Contributing

## Bugs and feature requests

Use the official repository (named Luigi, because this is a monorepo containing multiple projects) for bugs, ideas and features requests.

Go here: https://github.com/Koromix/luigi/issues

## Code style

Luiggi is programmed in a mix of C++ and assembly code (architecture-specific code). It uses [node-addon-api](https://github.com/nodejs/node-addon-api) (C++ N-API wrapper) to interact with Node.js.

My personal preference goes to a rather C-like C++ style, with careful use of templates (mainly for containers) and little object-oriented programming. I strongly prefer tagged unions and code locality over inheritance and virtual methods. Exceptions are disabled.

## Build from source

There are two ways: the first uses NPM and allows to run Luiggi code esily using Node.js, but will not give you the ability to produce redistribuable executable files.

The second one builds a modified Node.js binary.

### With NPM (easier)

This will allow to test Luiggi quickly, and allows for faster development. But you won't be able to build self-contained redistributable binaries of your games.

#### Windows

First, make sure the following dependencies are met:

* [Python 3.8](https://www.python.org/downloads/) or newer
* The "Desktop development with C++" workload from [Visual Studio 2022 or 2019](https://visualstudio.microsoft.com/downloads/) or the "C++ build tools" workload from the [Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022), with the default optional components.
* [CMake meta build system](https://cmake.org/)
* [Node 16 LTS](https://nodejs.org/), but a newer version should work too

Once these dependencies are met, simply run the follow command:

```sh
npm install
```

After that, running Luiggi scripts can be done this way:

```sh
node luiggi.js examples/words/words.luiggi
```

#### Linux

Make sure the following dependencies are met:

* Python 3.8 or newer
* `gcc` and `g++` >= 8.3 or newer
* GNU Make 3.81 or newer
* [CMake meta build system](https://cmake.org/)
* [Ninja](https://ninja-build.org/) build system

Once these dependencies are met, simply run the follow command:

```sh
npm install
```

After that, running Luiggi scripts can be done this way:

```sh
node luiggi.js examples/words/words.luiggi
```

#### macOS

Make sure the following dependencies are met:

* Python 3.8 or newer
* Xcode Command Line Tools >= 11 for macOS
* [CMake meta build system](https://cmake.org/)
* [Ninja](https://ninja-build.org/) build system

Once these dependencies are met, simply run the follow command:

```sh
npm install
```

After that, running Luiggi scripts can be done this way:

```sh
node luiggi.js examples/words/words.luiggi
```

### Modified Node.js binary (harder)

Luiggi uses a modified Node.js LTS binary that include a few additional modules, you need to build it first.

With this version, you will __soon__ be able to build self-contained redistributable binaries of your games.

#### Windows

To build Node, install the following dependencies:

* [Python 3.8](https://www.python.org/downloads/) or newer
* The "Desktop development with C++" workload from [Visual Studio 2022 or 2019](https://visualstudio.microsoft.com/downloads/) or the "C++ build tools" workload from the [Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022), with the default optional components.
* The [NetWide Assembler](https://www.nasm.us/), for OpenSSL modules. If not installed in the default location, it needs to be manually added to `PATH`. You can build without NASM, with option `--no_asm`.

Once these dependencies are met, open a command prompt in the repository and run the following command:

```sh
npm install # Only needed once
npm run build # Add `-- --no_asm` if you havne't installed and exposed NASM in path
```

After that, you can run the modified binary like this:

```sh
luiggi.exe luiggi.js examples/mighty.luiggi
```

#### Linux

To build Node, install the following dependencies:

* Python 3.8 or newer
* `gcc` and `g++` >= 8.3 or newer
* GNU Make 3.81 or newer
* [Ninja](https://ninja-build.org/) build system

Once these dependencies are met, open a command prompt in the repository and run the following command:

```sh
npm install # Only needed once
npm run build
```

After that, you can run the modified binary like this:

```sh
./luiggi luiggi.js examples/mighty.luiggi
```

#### macOS

* Python 3.8 or newer
* Xcode Command Line Tools >= 11 for macOS
* [Ninja](https://ninja-build.org/) build system

macOS users can install the `Xcode Command Line Tools` by running `xcode-select --install`. Alternatively, if you already have the full Xcode installed, you can find them under the menu `Xcode -> Open Developer Tool -> More Developer Tools...`. This step will install `clang`, `clang++`, and `make`.

Once these dependencies are met, open a command prompt in the repository and run the following command:

```sh
npm install # Only needed once
npm run build
```

After that, you can run the modified binary like this:

```sh
./luiggi luiggi.js examples/mighty.luiggi
```
