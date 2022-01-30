


# Introduction

Luigi is an educational toy programming language implemented in JS, with four main goals:

* Show a simple and relatively efficient implementation of a programming language:
  - Simple lexer implemented directly in JS.
  - Simple parser and bytecode compiler (without any intermediate AST).
  - Simple virtual machine, reusing JS data structures.
* Use a simple syntax reminescent of Python and BASIC, with minimal overhead.
* Provide a ready-to-use standard library with everything needed to implement simples 2D games (based on Raylib).
* Easy to use compilation to desktop (Windows, Linux, macOS) and web-ready WASM binaries, by packing the bytecode interpreter and a Luigi executable.

The language uses dynamic typing for implementation simplicity.

# Syntax

## Comments

Comments start with `#` and end at the end of the line:

```ruby
# This is a comment
x = 1 # This is also a comment
```

Block comments are explicitly not supported, in order to support context-independent line-by-line parsing.

## Identifiers and keywords

Identifiers start with a letter or an underscore, and may contain letters, digits and underscores. Identifiers starting with a double underscore `__` are not allowed. Case is sensitive.

The following list shows all reserved keywords used in Luigi.

```
func if then else end while for in to break continue return
and or not
```

Those keywords cannot be used as variable or function identifiers.

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

Assignment in Luigi is a statement. Contrary to other languages such as C, it is not possible to assign values to a variable in an expression.

## Control flow

Branching statements and expressions decide whether or not to execute some code and looping ones execute something more than once.

### Truth

Luigi considers the following expression results as false:

* The boolean value `false` is false.
* The null value `null` is false.
* The numeric value `0` is false .

Everything else is true, including empty strings and empty collections.

### If statement

The simplest branching statement, `if` lets you conditionally skip a chunk of code. It looks like this:

```ruby
if ready then log("Go!")
```

That evaluates the parenthesized expression after `if`. If it’s true, then the statement after the condition is evaluated. Otherwise it is skipped. Instead of a statement, you can have a [block](https://wren.io/syntax.html#blocks):

```ruby
if ready
    str = "Go!"
    log(str)
end
```

You may also provide an `else` branch. It will be executed if the condition is false:

```ruby
choice = 1

if choice = 0
    log("Choice 0")
else if choice = 1
    log("Choice 1") # Executed branch 
else
    log("Choice 2")
end
```

### While statement

They are two loop statements supported in Luigi.

The `while` statement is the simplest, it executes a chunk of code as long as a condition continues to hold. For example:

```ruby
# Hailstone sequence

n = 27

while n != 1
    if n % 2 == 0
        n = n / 2
    else
        n = 3 * n + 1
    end
end
```

This evaluates the expression n != 1. If it is true, then it executes the following body. After that, it loops back to the top, and evaluates the condition again. It keeps doing this as long as the condition evaluates to something true.

### For statement



## Values

### Primitive types

#### Null

The `null` value is special, and is used to indicate the absence of a value. If you call a function that doesn’t return anything, you get `null` back.

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

A list is a compound object that holds a collection of elements identified by integer index. You can create a list by placing a sequence of comma-separated expressions inside square brackets:

```ruby
[11, "foo", false]
```

You can also place each element on a separate line, in which case the comma can be skipped.

```ruby
[
    11, # You can use a comma
    "foo" # Or skip it if you want
    "bar"
]
```

The elements don’t have to be the same type.

#### Accessing elements

You can access an element from a list by calling the subscript syntax:

```ruby
animals = ["rabbit", "cat", "dog", "beetle"]
log(animals[0]) # rabbit
log(animals[1]) # cat
```

It’s a runtime error to pass an index outside of the bounds of the list. If you don’t know what those bounds are, you can find out using `length`:

```ruby
log(length(animals)) # 4
```

You can change an element by assigning a value to it:

```ruby
animals[0] = "horse"
log(animals) # ["horse", "cat", "dog", "beetle"]
```

#### Adding elements

You can use `append` to add elements to the end of an existing list:

```ruby
animals = ["rabbit", "cat"]
append(animals, "dog")
log(animals) # { "rabbit", "cat", "dog" }
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
7            | __+ -__       | Negate           | Unary  | Right

# How to use


