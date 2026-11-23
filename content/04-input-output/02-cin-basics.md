---
title: Reading Input with std::cin
summary: The extraction operator >>, how whitespace is skipped, reading several values of different types, what happens on bad input, and how to detect and recover from it.
---

Programs get much more interesting when they react to input. `std::cin` (from `<iostream>`) is the
**standard input stream**: whatever the user types, or whatever text is put in the IDE's
**Input (stdin)** box.

## The extraction operator `>>`

`std::cin >> x` **extracts** characters from the input, converts them to `x`'s type, and stores the
result in `x`. The arrows point the way the data flows: out of `std::cin`, into `x`.

```cpp run
#include <iostream>

int main() {
    int age = 0;
    std::cout << "How old are you? ";
    std::cin >> age;
    std::cout << "In ten years you will be " << age + 10 << ".\n";
}
```

With the input `25` in the stdin box, it prints:

```output
How old are you? In ten years you will be 35.
```

The `25` you typed doesn't appear in the output panel because it's *input*, not output. In a real
terminal you'd see it on screen as you type it. (If you run this with an empty stdin box, the read
fails and `age` keeps its starting value `0`; more on failure below.)

> **Tip:** Always give variables a starting value before reading into them (`int age = 0;`). If the read
> fails, you'll get a predictable value instead of garbage.

`std::cout` is **tied** to `std::cin`: it's automatically flushed before every read, so a prompt like
`"How old are you? "` always appears before the program waits, even without `std::endl`.

## Whitespace is skipped

Before reading a value, `>>` skips any **whitespace**: spaces, tabs, and newlines. Then it reads
characters until it hits one that can't be part of the value. So all of these inputs give exactly
the same result for `std::cin >> a >> b;`:

```
3 4
```

```
3
4
```

```
      3			4
```

You can't tell, with `>>`, how the values were laid out across lines. (When you *do* care about lines,
use `std::getline`, covered in the next lesson.)

## Reading multiple values

Just like `<<`, `>>` returns the stream, so you can chain it. Values are read left to right:

```cpp run
#include <iostream>

int main() {
    int a = 0, b = 0, c = 0;
    std::cin >> a >> b >> c;     // same as three separate std::cin >> statements
    std::cout << "sum = " << a + b + c << '\n';
}
```

With input `1 2 3` (or each number on its own line) it prints:

```output
sum = 6
```

## Reading different types

What `>>` reads depends on the type of the variable:

| Variable type | What `>>` reads (after skipping whitespace) |
| --- | --- |
| `int`, `long`, ... | an optional sign and digits: `-42` |
| `double`, `float` | a number like `3.5`, `-2`, `1e6`, `.5` |
| `char` | exactly **one** non-whitespace character |
| `std::string` | one **word**: characters up to the next whitespace |
| `bool` | `0` or `1` (or `true`/`false` after `std::cin >> std::boolalpha`) |

`std::string` is the standard type for text. It lives in the header `<string>`. You'll study it in
detail later; for now, know that `std::cin >> s` reads one word into it.

```cpp run
#include <iostream>
#include <string>

int main() {
    int count = 0;
    double price = 0.0;
    char grade = '?';
    std::string name;

    std::cin >> count >> price >> grade >> name;

    std::cout << "count = " << count << '\n';
    std::cout << "price = " << price << '\n';
    std::cout << "grade = " << grade << '\n';
    std::cout << "name  = " << name << '\n';
}
```

With input `3 9.99 A Ada Lovelace`:

```output
count = 3
price = 9.99
grade = A
name  = Ada
```

Only `Ada` is read into `name`, because `>>` stops at the space. `Lovelace` is still waiting in the
input for whoever reads next.

### Reading stops at the first character that doesn't fit

`>>` reads **as much as makes sense** for the type and leaves the rest in the input:

| Input | Code | Result |
| --- | --- | --- |
| `12abc` | `std::cin >> n >> s;` (int, string) | `n = 12`, `s = "abc"` |
| `3.75` | `std::cin >> n;` (int) | `n = 3`, `.75` is left in the input |
| `3.75` | `std::cin >> d;` (double) | `d = 3.75` |
| `- 5` | `std::cin >> n;` (int) | fails: a `-` followed by a space isn't a number |
| `xyz` | `std::cin >> c;` (char) | `c = 'x'`, `yz` left in the input |

## Bad input and the fail state

What if the user types `hello` when you asked for an `int`? Nothing sensible can be extracted, so:

1. The read **fails**. The stream sets its internal **failbit**.
2. The variable is set to `0` (since C++11). If the number was too big for the type, it's set to the
   largest (or smallest) value the type can hold instead.
3. The bad characters (`hello`) are **left in the input**.
4. **Every further read does nothing** until you clear the error. The stream is now in a
   **fail state**, and it stays there.

```cpp run
#include <iostream>

int main() {
    int a = -1, b = -1;
    std::cin >> a;
    std::cin >> b;     // does nothing if the first read failed
    std::cout << "a = " << a << ", b = " << b << '\n';
}
```

With input `hello 5`:

```output
a = 0, b = -1
```

The first read fails, sets `a` to `0`, and puts `std::cin` in the fail state. The second read
doesn't even try, so `b` keeps its starting value `-1`, even though there's a perfectly good `5`
in the input.

Running out of input is also a failure: if there's nothing left to read (the end of input, or
**EOF**), the read fails and the stream's **eofbit** is set too.

## Checking whether a read worked

A stream can be used as a condition. It's "true" when the stream is fine and "false" after a failure.
Since `std::cin >> x` evaluates to `std::cin`, you can **read and check in one step**:

```cpp run
#include <iostream>

int main() {
    int n = 0;
    if (std::cin >> n) {
        std::cout << "You entered " << n << '\n';
    } else {
        std::cout << "That was not a number\n";
    }
}
```

`if (condition) { ... } else { ... }` runs the first block when the condition is true and the second
block otherwise. You'll study `if` properly in the Control Flow module; this pattern is all you need
for now.

With input `42` it prints `You entered 42`. With input `abc`, or with an empty stdin box, it prints
`That was not a number`.

All the ways to ask a stream about its state:

| Expression | True when |
| --- | --- |
| `if (std::cin >> x)` | the read succeeded |
| `if (std::cin)` | the stream is OK (no failure so far) |
| `if (!std::cin)` | the stream has failed |
| `std::cin.fail()` | the last operation failed (bad format **or** end of input) |
| `std::cin.eof()` | the end of input was reached |
| `std::cin.good()` | nothing at all has gone wrong |

```cpp
int x = 0;
std::cin >> x;
if (std::cin.fail()) {
    std::cout << "read failed\n";
}

if (!(std::cin >> x)) {          // note the extra parentheses around the read
    std::cout << "read failed\n";
}
```

## Recovering: `clear()` and `ignore()`

To use `std::cin` again after a failure you need **two** steps:

1. `std::cin.clear();` resets the error flags, so the stream works again.
2. `std::cin.ignore(...)` throws away the bad characters that are still in the input. Otherwise the
   next read would trip over them and fail again.

The usual way to discard "everything up to and including the end of the current line" is:

```cpp
std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
```

That reads: "ignore as many characters as it takes (the maximum possible count), stopping after a
`'\n'`". `std::numeric_limits` comes from the header `<limits>`. Shorter forms exist too:

```cpp
std::cin.ignore();          // discard exactly one character
std::cin.ignore(100, '\n'); // discard up to 100 characters, or through the next newline
```

```cpp run
#include <iostream>
#include <limits>

int main() {
    int n = 0;
    if (std::cin >> n) {
        std::cout << "first try: " << n << '\n';
    } else {
        std::cout << "bad input, trying the next line\n";
        std::cin.clear();                                                    // 1. reset the error
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // 2. skip the bad line
        if (std::cin >> n) {
            std::cout << "second try: " << n << '\n';
        }
    }
}
```

With this input:

```
oops
17
```

it prints:

```output
bad input, trying the next line
second try: 17
```

> **Pitfall:** The order matters. `ignore()` on a failed stream does nothing, so you must `clear()`
> **first**, then `ignore()`.

In the Control Flow module you'll put this inside a loop that keeps asking until the input is valid.

## Common mistakes

**Arrows the wrong way.** `<<` is for output, `>>` is for input:

```cpp compile-error
#include <iostream>

int main() {
    int x = 0;
    std::cin << x;    // error: no match for 'operator<<'
}
```

**Using a comma instead of chaining.** `std::cin >> a, b;` compiles (with a warning) but only reads
`a`. The comma operator just evaluates `b` and does nothing with it. Write `std::cin >> a >> b;`.

**Reading into something that isn't a variable.** You can only extract into something that can be
assigned to:

```cpp compile-error
#include <iostream>

int main() {
    std::cin >> 5;    // error: you can't store input in the number 5
}
```

**Assuming the read worked.** Users (and test cases) type unexpected things. If it matters, check.

:::quiz
The input is `12abc`. What are `n` and `s` after `std::cin >> n >> s;` (with `int n` and `std::string s`)?

- [x] `n` is `12` and `s` is `"abc"`
- [ ] `n` is `0` and the stream is in the fail state
- [ ] `n` is `12` and `s` is empty
- [ ] `n` is `12abc`

Reading an `int` stops at the first non-digit and leaves `abc` in the input. The string read then picks it up.
:::

:::quiz
`int a = 1, b = 2;` The input is `x 7`. After `std::cin >> a >> b;`, what are `a` and `b`?

- [ ] `a` is `1` and `b` is `7`
- [x] `a` is `0` and `b` is `2`
- [ ] `a` is `0` and `b` is `7`
- [ ] `a` is `1` and `b` is `2`

`x` isn't an integer, so the first read fails and sets `a` to `0`. The stream is now in the fail state,
so the second read does nothing and `b` keeps its value.
:::

:::quiz
After a failed read, which sequence makes `std::cin` usable again and skips the rest of the bad line?

- [ ] `std::cin.ignore(...)` then `std::cin.clear()`
- [x] `std::cin.clear()` then `std::cin.ignore(...)`
- [ ] Just read again; the stream fixes itself
- [ ] `std::cin.clear()` alone

`clear()` resets the error flags; only then can `ignore()` actually remove the bad characters.
:::

:::exercise Average of three {easy}
Read three integers and print their sum and their average.

**Input:** three integers, separated by any whitespace.
**Output:** two lines:

```
Sum: <sum>
Average: <average>
```

The average must not be truncated: for input `1 2 4` it is `2.33333` (print the `double` with plain `<<`).

```cpp starter
#include <iostream>

int main() {
    int a = 0, b = 0, c = 0;
    // read the three numbers

    int sum = a + b + c;
    std::cout << "Sum: " << sum << '\n';
    std::cout << "Average: " << sum / 3 << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0, b = 0, c = 0;
    std::cin >> a >> b >> c;

    int sum = a + b + c;
    std::cout << "Sum: " << sum << '\n';
    std::cout << "Average: " << sum / 3.0 << '\n';
}
```

```hint
`std::cin >> a >> b >> c;` reads all three.
```

```hint
`sum / 3` is integer division. Divide by `3.0` to get a `double` result.
```

```stdin
1 2 4
```

```expected
Sum: 7
Average: 2.33333
```

```stdin
10
20
30
```

```expected
Sum: 60
Average: 20
```

```stdin
-3 0 3
```

```expected hidden
Sum: 0
Average: 0
```

```stdin
-1 -1 0
```

```expected hidden
Sum: -2
Average: -0.666667
```

```checks
must cin\s*>> :: Read the numbers with std::cin >>.
```
:::

:::exercise Name and age {easy}
Read a first name (one word) and an age, then print two sentences.

**Input:** a name and an integer age, e.g. `Ada 36`.
**Output:**

```
Ada is 36 years old.
Next year Ada will be 37.
```

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string name;
    int age = 0;

    std::cout << name << " is " << age << " years old.\n";
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string name;
    int age = 0;
    std::cin >> name >> age;

    std::cout << name << " is " << age << " years old.\n";
    std::cout << "Next year " << name << " will be " << age + 1 << ".\n";
}
```

```hint
`std::cin >> name >> age;` reads a word into the string and then a number into the int.
```

```stdin
Ada 36
```

```expected
Ada is 36 years old.
Next year Ada will be 37.
```

```stdin
Bjarne
0
```

```expected hidden
Bjarne is 0 years old.
Next year Bjarne will be 1.
```

```stdin
Grace   -1
```

```expected hidden
Grace is -1 years old.
Next year Grace will be 0.
```

```checks
must cin\s*>> :: Read the input with std::cin >>.
```
:::

:::exercise Validate the number {easy}
Read one integer and report whether the read worked.

**Input:** one token, which may or may not be an integer.
**Output:** `You entered N` if an integer could be read (where `N` is the number), otherwise
`Invalid input`.

Note that `12abc` *does* start with an integer, so it counts as `You entered 12`.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << "You entered " << n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    if (std::cin >> n) {
        std::cout << "You entered " << n << '\n';
    } else {
        std::cout << "Invalid input\n";
    }
}
```

```hint
Put the read inside the condition: `if (std::cin >> n) { ... } else { ... }`.
```

```stdin
42
```

```expected
You entered 42
```

```stdin
abc
```

```expected
Invalid input
```

```stdin
12abc
```

```expected hidden
You entered 12
```

```stdin
-7
```

```expected hidden
You entered -7
```

```stdin
+15
```

```expected hidden
You entered 15
```

```stdin
- 5
```

```expected hidden
Invalid input
```

```checks
must \bif\b :: Use an if statement to check whether the read worked.
```
:::

:::exercise Second chance {medium}
Read an integer. If the first line isn't a valid integer, print a message, recover the stream, skip
the rest of that line, and read the integer from the next line instead.

**Input:** one or two lines. The first line either starts with an integer, or is invalid. If it's
invalid, the second line contains a valid integer.
**Output:**

- If the first read fails, first print `Bad input, skipping line`.
- Then print `Value: N` with the integer that was finally read.

For the input

```
abc def
15
```

the output is:

```
Bad input, skipping line
Value: 15
```

```cpp starter
#include <iostream>
#include <limits>

int main() {
    int n = 0;
    if (!(std::cin >> n)) {
        std::cout << "Bad input, skipping line\n";
        std::cin >> n;
    }
    std::cout << "Value: " << n << '\n';
}
```

```cpp solution
#include <iostream>
#include <limits>

int main() {
    int n = 0;
    if (!(std::cin >> n)) {
        std::cout << "Bad input, skipping line\n";
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        std::cin >> n;
    }
    std::cout << "Value: " << n << '\n';
}
```

```hint
After a failed read, the stream ignores every further read until you call `std::cin.clear()`.
```

```hint
After clearing, the bad characters are still in the input. Remove the rest of the line with
`std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');`.
```

```stdin
abc def
15
```

```expected
Bad input, skipping line
Value: 15
```

```stdin
8
```

```expected
Value: 8
```

```stdin
x
-40
```

```expected hidden
Bad input, skipping line
Value: -40
```

```stdin
hello 99
7
```

```expected hidden
Bad input, skipping line
Value: 7
```

```stdin
12abc
99
```

```expected hidden
Value: 12
```

```checks
must \.clear\s*\( :: Reset the stream with std::cin.clear().
must \.ignore\s*\( :: Skip the bad line with std::cin.ignore(...).
```
:::

:::exercise Strict record {hard}
Read a record made of a name (one word), an age (an integer) and a height in meters (a number), in that
order, and report **exactly** what went wrong if the record is incomplete or malformed.

**Input:** up to three whitespace-separated fields: `name age height`. Any field may be missing (the input
just ends early) or malformed (something that isn't a number where a number is expected).
**Output:** exactly one line:

| Situation | Output |
| --- | --- |
| the input is empty | `Missing name` |
| no age at all (input ended) | `Missing age` |
| the age isn't an integer | `Bad age` |
| no height at all (input ended) | `Missing height` |
| the height isn't a number | `Bad height` |
| everything was read | `<name>: <age> years, <height> m` (height with plain `<<`) |

Remember the rule from this lesson: `>>` reads as much as fits, so `36abc` gives the age `36` and leaves
`abc` for the height. Examples:

| Input | Output |
| --- | --- |
| `Ada 36 1.7` | `Ada: 36 years, 1.7 m` |
| `Ada thirty 1.7` | `Bad age` |
| `Ada 36` | `Missing height` |

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string name;
    int age = 0;
    double height = 0.0;
    std::cin >> name >> age >> height;
    std::cout << name << ": " << age << " years, " << height << " m\n";
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string name;
    int age = 0;
    double height = 0.0;

    if (!(std::cin >> name)) {
        std::cout << "Missing name\n";
    } else if (!(std::cin >> age)) {
        if (std::cin.eof()) {
            std::cout << "Missing age\n";
        } else {
            std::cout << "Bad age\n";
        }
    } else if (!(std::cin >> height)) {
        if (std::cin.eof()) {
            std::cout << "Missing height\n";
        } else {
            std::cout << "Bad height\n";
        }
    } else {
        std::cout << name << ": " << age << " years, " << height << " m\n";
    }
}
```

```hint
Read one field at a time and check each read right away: `if (!(std::cin >> age)) { ... }`.
```

```hint
After a read **fails**, `std::cin.eof()` tells you why: true means the input ran out (missing), false
means there was something that couldn't be converted (bad).
```

```hint
Don't test `eof()` *before* checking whether the read failed: reading the last value of an input that
has no trailing newline sets the eof flag even though that read **succeeded**.
```

```stdin
Ada 36 1.7
```

```expected
Ada: 36 years, 1.7 m
```

```stdin
Ada thirty 1.7
```

```expected
Bad age
```

```stdin
Ada 36
```

```expected
Missing height
```

```stdin
```

```expected hidden
Missing name
```

```stdin
Bjarne
```

```expected hidden
Missing age
```

```stdin
Linus 0 abc
```

```expected hidden
Bad height
```

```stdin
Grace 85abc 1.5
```

```expected hidden
Bad height
```

```stdin
Al -3 -0.5
```

```expected hidden
Al: -3 years, -0.5 m
```

```checks
must \.eof\s*\( :: Use std::cin.eof() to tell "missing" from "bad".
```
:::
