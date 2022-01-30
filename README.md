# Introduction

Luigi is an educational toy programming language implemented in JS, with four main goals:

* Show a simple and relatively efficient implementation of a programming language:
  - Simple lexer (tokenizer) implemented directly in JS.
  - Simple parser and bytecode compiler (without any intermediate AST).
  - Simple virtual machine, reusing JS data structures.
* Use a simple syntax reminescent of Python and BASIC, with minimal overhead.
* Provide a ready-to-use standard library with everything needed to implement simple 2D games (based on Raylib).
* Easy to use compilation to desktop (Windows, Linux, macOS) and web-ready WASM binaries, by packing the bytecode interpreter and a Luigi executable.

The language uses dynamic typing for implementation simplicity.

# Syntax

## Comments

Comments start with `#` and end at the end of the line:

```ruby
# This is a comment
x = 1 # This is also a comment
```

Multi-line comments are explicitly not supported, in order to support context-independent line-by-line parsing.

## Identifiers and keywords

Identifiers start with a letter or an underscore, and may contain letters, digits and underscores. Identifiers starting with a double underscore `__` are not allowed. Case is sensitive.

The following list shows all reserved keywords used in Luigi.

```
func if then else end while for in to break continue return
and or not
```

These keywords cannot be used as variable or function identifiers.

## Blocks

A block is a list of statements, which are executed sequentially.

Newlines (`\n`) are meaningful in Luigi, they are used to separate statements:

```ruby
log("Hello")
log("World")
```

Luigi strives to support multi-line statements where appropriate, such as in the middle of an unfinished expression:

```ruby
log("Hello " +
    "World")
```

## Assignment

The same syntax is used to declare and assign a value to a variable:

```ruby
foo = (1 + 2) * 6 # Declares the variable foo, and assign 18 to it
foo = "Hello" + " World" # Assign "Hello World" to foo
```

Assignment in Luigi is a statement. Contrary to other languages such as C, it is not possible to assign values to a variable in the middle of an expression.

## Control flow

Branching statements and expressions decide whether or not to execute some code and looping ones execute something more than once.

### Truth

Luigi considers the following expression results as false:

* The boolean value `false` is false.
* The null value `null` is false.
* The numeric value `0` is false.

Everything else is true, including empty strings and empty collections.

### If statement

The simplest branching statement, `if` lets you conditionally skip a chunk of code. It looks like this:

```ruby
if ready then log("Go!")
```

This evaluates the expression after `if`. If it's true, then the statement or block after the `then` is evaluated, otherwise it is skipped.

Instead of a single statement, you can have a block of code, in which case you must omit `then` and directly go to the next line:

```ruby
if ready
    str = "Go!"
    log(str)
end
```

You may also provide one or several `else if` branches, and a final `else` branch. Each `else if` branch will be executed if the condition is true (and the previous ones were false). The final `else` branch will be executed if all previous conditions were false.

```ruby
choice = 1

if choice = 0
    log("Choice 0") # Not executed
else if choice = 1
    log("Choice 1") # Executed
else
    log("Choice 2") # Not executed
end
```

Single-line `if <expr> then <statement>` constructs cannot use `else`.

### While statement

There are two loop statements in Luigi, and they should be familiar if you've used other imperative languages.

The simplest is the `while` statement. It executes a chunk of code as long as a condition continues to hold. For example:

```ruby
# Hailstone sequence

n = 27
while n != 1
    log(n)

    if n % 2 = 0
        n = n / 2
    else
        n = 3 * n + 1
    end
end
```

### For statement

The `for` statement exists in two form: the first iterates through a list elements, and the second one creates an index variable that is incremented from a start value (inclusive) to an end value (non-inclusive).

The first form can be used like this:

```ruby
for beatle in ["george", "john", "paul", "ringo"]
    log(beatle)
end

# Prints out george, john, paul, ringo
```

The second form can be used like this:

```ruby
animals = ["rabbit", "cat", "dog"]

for i in 0 to length(animals)
    log(i + " = " + animals[i]
end

# Prints out 0 = rabbit, 1 = cat, 2 = dog
```

### Break and continue statements

You can use `break` to bail out right in the middle of a loop body. It exits from the nearest enclosing `while` or `for` loop.

```ruby
for i in [1, 2, 3, 4]
    log(i)
    if i = 3 then break
end

# Prints out 1, 2, 3 (but not 4)
```

The `continue` can be used to skip the remaining loop body and move to the next iteration. Execution will immediately jump to the beginning of the next loop iteration (and check the loop condition).

```ruby
for i in [1, 2, 3, 4]
    if i = 2 then continue
    log(i)
end

# Prints out 1, 3 and 4 (but not 2)
```
## Functions

You can define a function with the following syntax:

```nim
func sum(x, y)
  return x + y
end
```

Once defined, the function can be called by specifying an argument for each parameter, separated by a comma.

```ruby
value = sum(3, 22)
log(value) # Print out 25
```

The value `null` is returned implictly if function execution ends without a return statement.

Just like in Javascript and other languages, functions can be called before they are defined:

```nim
hello("Jack")

func hello(name)
    log("Hello " + name)
end
```

## Values

### Primitive types

#### Null

The `null` value is special, and is used to indicate the absence of a value. If you call a function that doesn't return anything, you get `null` back.

#### Booleans

A boolean value represents truth or falsehood. There are two boolean literals, `true` and `false`.

#### Numbers

Luigi has a single numeric type: double-precision floating point.

```ruby
12
-5678
3.14159
1.0
-12.34
```

#### Strings

A string is an array of bytes. Typically, they store characters encoded in UTF-8, but you can put any byte values in there, even zero or invalid UTF-8 sequences, even though it is probably not the best idea.

String literals are surrounded in simple or double quotes, and the following lines are equivalent:

```ruby
"Foo!"
'Bar!'
```

Multi-line strings are explicitly not supported, in order to support context-independent line-by-line parsing.

The following escape sequences can be used in string literals:

```ruby
"\n" # Newline
"\r" # Carriage return
"\t" # Tab
"\'" # A simple quote character
"\"" # A double quote character
"\\" # A backslash
```

### Lists

#### Definition

A list is a compound object that holds a collection of elements identified by an integer index. You can create a list by placing a sequence of comma-separated expressions inside square brackets:

```ruby
[11, "foo", false]
```

You can also place each element on a separate line, in which case the comma can be skipped:

```ruby
[
    11, # You can use a comma
    "foo" # Or skip it if you want
    "bar"
]
```

The elements don't have to be of the same type.

#### Accessing elements

You can access an element from a list with the subscript syntax:

```ruby
animals = ["rabbit", "cat", "dog", "beetle"]
log(animals[0]) # rabbit
log(animals[1]) # cat
```

It's a runtime error to pass an index outside of the bounds of the list. If you don't know what those bounds are, you can find out using `length`:

```ruby
log(length(animals)) # 4
```

You can change an element by assigning a value to it:

```ruby
animals[0] = "horse"
log(animals) # horse, cat, dog, beetle
```

#### Adding elements

You can use `append` to add elements to the end of an existing list:

```ruby
animals = ["rabbit", "cat"]
append(animals, "dog")
log(animals) # rabbit, cat, dog
```

#### Remove elements

Use `truncate` to remove elements from the end of an existing list:

```ruby
animals = ["rabbit", "cat", "dog"]
truncate(animals, 2)
log(animals) # rabbit
```

### Objects

#### Definition

An object is a compound object that holds a collection of elements identified by an identifier. You can create an object by placing a sequence of assignments inside curly braces:

```ruby
{ x = 1, y = 2 }
```

You can also place each element on a separate line, in which case the comma can be skipped.

```ruby
{
    x = 1, # You can use a comma
    y = 2 # Or skip it if you want
    z = 3
}
```

Once an object is created, you cannot add or remove members.

#### Accessing members

You can access an element from an object by using the dot operator:

```ruby
player = { name = "Niels", x = 1, y = 2 }
log(vec.name) # Niels
log(vec.x) # 1
```

You can change an element by assigning a value to it:

```ruby
vec.name = "Luigi"
log(vec.name) # Luigi
```

## Operators

The following operators are supported in expressions, by order of precedence, from loosest to tightest:

Prececedence | Operator      | Description      | Type   | Associates
-------------|---------------|------------------|--------|-----------
1            | __or__        | Logical OR       | Binary | Left
2            | __and__       | Logical AND      | Binary | Left
3            | __not__       | Logical NOT      | Unary  | Right
4            | __< <= > >=__ | Comparison       | Binary | Left
5            | __+ -__       | Add, substract   | Binary | Left
6            | __* /__       | Multiply, Divide | Binary | Left
7            | __-__         | Negate           | Unary  | Right

# Standard library

## Console

Function     | Parameters  | Description
-------------|-------------|---------------------------------------------
**log**      | value       | Log value to console (with newline)
**print**    | value       | Print raw value to console (without newline)

## Strings

Function     | Parameters  | Description
-------------|-------------|-------------------------------------
**length**   | str         | Return length of list or string
**upper**    | str         | Return string converted to uppercase
**lower**    | str         | Return string converted to lowercase

## Lists

Function     | Parameters  | Description
-------------|-------------|-------------------------------------------
**length**   | list        | Return length of list
**append**   | list, value | Append value to list
**truncate** | list, count | Remove count elements from the end of list

## Objects

Function    | Parameters         | Description
------------|--------------------|--------------------------------------------
**members** | obj                | List object members
**get**     | obj, member        | Get member from object
**set**     | obj, member, value | Set member in object

## Random

Function         | Parameters | Description
-----------------|------------|--------------------------------------------------------------------
**random**       |            | Return random float between 0 (included) and 1 (non-included)
**random_float** | min, max   | Return random float between min (included) and max (non-included)
**random_int**   | min, max   | Return random integer between min (included) and max (non-included)

## Math

Function     | Parameters  | Description
-------------|-------------|-------------------------------------------------------------------
**min**      | x, y        | Return smallest value between x and y
**max**      | x, y        | Return biggest value between x and y
**clamp**    | x, min, max | Return x clamped between min and max
**is_nan**   | x           | Return true if x is a NaN, false otherwise
**floor**    | x           | Round x to the next smaller integer
**ceil**     | x           | Round x to the next larger integer
**round**    | x           | Round x to the nearest integer
**abs**      | x           | Return absolute value of x
**exp**      | x           | Return `e ^ x`
**ln**       | x           | Return the natural logarithm of x
**log2**     | x           | Return the base 2 logarithm of x
**log10**    | x           | Return the base 10 logarithm of x
**pow**      | x, exponent | Return `x ^ power`
**sqrt**     | x           | Return the square root of x
**cbrt**     | x           | Return the cubic root of x
**cos**      | x           | Return the cosine of the specified angle (in radians)
**sin**      | x           | Return the sine of the specified angle (in radians)
**tan**      | x           | Return the tangent of the specified angle (in radians)
**acos**     | x           | Return the arccosine (in radians) of a number
**asin**     | x           | Return the arcsine (in radians) of a number
**atan**     | x           | Return the arctangent (in radians) of a number
**atan2**    | x, y        | Return the principal value of the arctangent (in radians) of `y/x`

## Drawing

# How to use

## Running Luigi

First, install Node.js (14+) by following the instructions on the official website: https://nodejs.org/

In order to run Luigi after cloning the repository, you need to install the required node modules with the following command:

```sh
npm ci
```

After that, running Luigi programs is relatively simple:

```sh
node luigi.mjs examples/test.luigi
```

As of now, Luigi does not yet support compilation to binaries or HTML/WebAssembly.

## Examples

You can find several examples in the _examples/_ subdirectory, including a small game in _examples/words/_.

You are free to study and modify them as long as you respect the conditions of the AGPL 3.0 license.
