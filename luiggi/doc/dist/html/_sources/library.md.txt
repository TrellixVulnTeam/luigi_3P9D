# Standard library

## Console

Function     | Parameters  | Description
-------------|-------------|---------------------------------------------
**log**      | value       | Log value to console (with newline)

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

## Functions

Function    | Parameters         | Description
------------|--------------------|--------------------------------------------
**params**  | params             | List function parameters

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

## Random

Function         | Parameters | Description
-----------------|------------|--------------------------------------------------------------------
**random**       |            | Return random float between 0 (included) and 1 (non-included)
**random_float** | min, max   | Return random float between min (included) and max (non-included)
**random_int**   | min, max   | Return random integer between min (included) and max (non-included)

## Drawing

XXX
