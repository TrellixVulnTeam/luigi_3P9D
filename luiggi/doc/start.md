# Get started

## Install dependencies

First, make sure the various dependencies are met for your OS.

### Windows

* [Node 16 LTS](https://nodejs.org/), but a newer version should work too
* [Python 3.8](https://www.python.org/downloads/) or newer
* The "Desktop development with C++" workload from [Visual Studio 2022 or 2019](https://visualstudio.microsoft.com/downloads/) or the "C++ build tools" workload from the [Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022), with the default optional components.
* [CMake meta build system](https://cmake.org/)

### Linux

* [Node 16 LTS](https://nodejs.org/), but a newer version should work too
* Python 3.8 or newer
* `gcc` and `g++` >= 8.3 or newer
* GNU Make 3.81 or newer
* [CMake meta build system](https://cmake.org/)

### macOS

* [Node 16 LTS](https://nodejs.org/), but a newer version should work too
* Python 3.8 or newer
* Xcode Command Line Tools >= 11 for macOS
* [CMake meta build system](https://cmake.org/)

## Build from source

Once these dependencies are met, start by cloning the repository with [Git](https://git-scm.com/), and then run `npm install`:

```sh
git clone https://github.com/Koromix/luigi
cd luigi/luiggi
npm install
```

## Run examples

You can find several examples in the `examples/` subdirectory, including a small game in `examples/words/`.

To run the Mighty screensaver example, run the following command:

```sh
node luiggi.js examples/mighty.luiggi
```

You are free to study and modify these examples as you respect the conditions of the AGPL 3.0 license.
