# Types and values

## Primitive types

### Null

The `null` value is special, and is used to indicate the absence of a value. If you call a function that doesn't return anything, you get `null` back.

### Booleans

A boolean value represents truth or falsehood. There are two boolean literals, `true` and `false`.

### Numbers

Luiggi has a single numeric type: double-precision floating point.

```ruby
12
-5678
3.14159
1.0
-12.34
```

### Strings

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

## Lists

### Definition

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

### Accessing elements

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

### Adding elements

You can use `append` to add elements to the end of an existing list:

```ruby
animals = ["rabbit", "cat"]
append(animals, "dog")
log(animals) # rabbit, cat, dog
```

### Remove elements

Use `truncate` to remove elements from the end of an existing list:

```ruby
animals = ["rabbit", "cat", "dog"]
truncate(animals, 2)
log(animals) # rabbit
```

## Objects

### Definition

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

### Accessing members

You can access an element from an object by using the dot operator:

```ruby
player = { name = "Niels", x = 1, y = 2 }
log(vec.name) # Niels
log(vec.x) # 1
```

You can change an element by assigning a value to it:

```ruby
vec.name = "Luiggi"
log(vec.name) # Luiggi
```

