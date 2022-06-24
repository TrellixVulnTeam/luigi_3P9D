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

Reserved keywords cannot be used as variable or function identifiers. The following list shows all reserved keywords used in Luiggi:

```
func if then else end while for in to break continue return
and or not
```

Identifiers starting with a capital letter (A - Z) define constant variables. Once defined, constant variable values cnanot be changed.

```ruby
CONST = 1
CONST = 2 # Error: Cannot assign to constant variable "CONST"
```

## Blocks

A block is a list of statements, which are executed sequentially.

Newlines (`\n`) are meaningful in Luiggi, they are used to separate statements:

```ruby
log("Hello")
log("World")
```

Luiggi strives to support multi-line statements where appropriate, such as in the middle of an unfinished expression:

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

Assignment in Luiggi is a statement. Contrary to other languages such as C, it is not possible to assign values to a variable in the middle of an expression.

## Control flow

Branching statements and expressions decide whether or not to execute some code and looping ones execute something more than once.

### Truth

Luiggi considers the following expression results as false:

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

There are two loop statements in Luiggi, and they should be familiar if you've used other imperative languages.

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
