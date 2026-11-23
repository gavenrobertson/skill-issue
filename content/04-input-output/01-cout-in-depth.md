---
title: std::cout in Depth
summary: How output streams work, chaining, '\n' vs std::endl, flushing, std::cerr and std::clog, printing every basic type, and std::boolalpha.
---

You've been using `std::cout` since your first program. This lesson explains what it actually is, so
the rest of this module (reading input, formatting) makes sense.

## Streams

A **stream** is a sequence of characters flowing somewhere. C++ I/O is built on stream objects
declared in `<iostream>`:

| Object | Type | Connected to | Buffered? |
| --- | --- | --- | --- |
| `std::cout` | output stream (`std::ostream`) | **standard output** (stdout) | yes |
| `std::cerr` | output stream | **standard error** (stderr) | no, every write appears immediately |
| `std::clog` | output stream | **standard error** (stderr) | yes |
| `std::cin` | input stream (`std::istream`) | **standard input** (stdin) | yes |

Every program gets three standard channels from the operating system: **stdin** (input, usually the
keyboard), **stdout** (normal output, usually the terminal), and **stderr** (error messages, also
usually the terminal). They look the same on screen, but they're separate pipes, and that matters
(more below).

## The insertion operator `<<` and chaining

`std::cout << x` **inserts** `x` into the stream: it converts the value to characters and sends them out.
The expression `std::cout << x` then evaluates to `std::cout` itself. That's why chaining works:

```cpp
std::cout << "a" << "b" << '\n';
// is grouped as:
((std::cout << "a") << "b") << '\n';
// step 1 prints "a" and gives back std::cout, step 2 prints "b" and gives back std::cout, ...
```

So these two snippets print exactly the same thing:

```cpp run
#include <iostream>

int main() {
    int apples = 3;

    std::cout << "I have " << apples << " apples.\n";   // one chained statement

    std::cout << "I have ";                             // three separate statements
    std::cout << apples;
    std::cout << " apples.\n";
}
```

```output
I have 3 apples.
I have 3 apples.
```

`<<` does **not** add spaces or newlines for you. If you want a space between two values, insert one:

```cpp run
#include <iostream>

int main() {
    int a = 1, b = 2;
    std::cout << a << b << '\n';          // 12  (oops, glued together)
    std::cout << a << ' ' << b << '\n';   // 1 2
}
```

```output
12
1 2
```

## Printing every basic type

`std::cout` knows how to print all the built-in types, and each one has its own rules:

```cpp run
#include <iostream>
#include <string>

int main() {
    int i = -42;
    long long big = 9'000'000'000;
    unsigned u = 7;
    double d = 3.14159265358979;
    float f = 2.5f;
    char c = 'A';
    bool flag = true;
    std::string s = "a std::string";

    std::cout << i << '\n';
    std::cout << big << '\n';
    std::cout << u << '\n';
    std::cout << d << '\n';       // only 6 significant digits by default!
    std::cout << f << '\n';
    std::cout << c << '\n';       // a char prints as a character...
    std::cout << c + 1 << '\n';   // ...but char + int is an int, so this prints a number
    std::cout << static_cast<char>(c + 1) << '\n';  // convert back to char to print a character
    std::cout << flag << '\n';    // bool prints as 1 or 0
    std::cout << s << '\n';
    std::cout << "a string literal" << '\n';
}
```

```output
-42
9000000000
7
3.14159
2.5
A
66
B
1
a std::string
a string literal
```

Things to notice:

- **Floating-point numbers** print with at most **6 significant digits** by default, and trailing zeros
  are dropped: `3.14159265358979` prints as `3.14159`, `100.0` prints as `100`. Very large or small
  values switch to scientific notation: `1234567.0` prints as `1.23457e+06`. You'll learn to control
  this in the formatting lessons.
- **`char`** prints as a character, but arithmetic on a `char` produces an `int`, which prints as a number.
- **`bool`** prints as `1` or `0` unless you ask for words (next section).

### Printing expressions

You can print any expression. Arithmetic works without parentheses because `+ - * / %` bind tighter
than `<<`:

```cpp run
#include <iostream>

int main() {
    int a = 7, b = 2;
    std::cout << a + b << ' ' << a * b << ' ' << a / b << ' ' << a % b << '\n';
    std::cout << (a > b) << '\n';   // comparisons NEED parentheses
}
```

```output
9 14 3 1
1
```

Comparison operators like `<` and `==`, and the logical and bitwise operators, bind **looser**
than `<<`, so without parentheses the compiler sees something nonsensical:

```cpp compile-error
#include <iostream>

int main() {
    int a = 7, b = 2;
    std::cout << a > b << '\n';   // parsed as (std::cout << a) > (b << '\n')
}
```

GCC says `no match for 'operator>' (operand types are 'std::basic_ostream<char>' and 'int')`. When in
doubt, wrap the expression in parentheses.

## `std::boolalpha`: printing `true` / `false`

By default a `bool` prints as `1` or `0`. Insert the **manipulator** `std::boolalpha` and from then on
bools print as words. `std::noboolalpha` switches back.

```cpp run
#include <iostream>

int main() {
    bool ready = true;
    bool done = false;

    std::cout << ready << ' ' << done << '\n';
    std::cout << std::boolalpha;            // affects everything printed afterwards
    std::cout << ready << ' ' << done << '\n';
    std::cout << (3 < 5) << '\n';
    std::cout << std::noboolalpha << ready << '\n';
}
```

```output
1 0
true false
true
1
```

A **manipulator** is something you insert into a stream to change *how* it prints, rather than *what*.
`std::boolalpha` is **sticky**: it stays in effect on `std::cout` until you change it back.
You'll meet many more manipulators in the `<iomanip>` lesson.

## `'\n'` vs `std::endl`, and flushing

Writing to the terminal is slow compared to everything else your program does, so `std::cout` is
**buffered**: characters are collected in memory and sent out in big chunks. Sending the buffered
characters out is called **flushing**.

- `'\n'` (or `"\n"` inside a string) just adds a newline character to the buffer.
- `std::endl` adds a newline **and flushes** the buffer.
- `std::flush` flushes **without** adding a newline.

```cpp run
#include <iostream>

int main() {
    std::cout << "newline only\n";
    std::cout << "newline and flush" << std::endl;
    std::cout << "no newline, but flushed" << std::flush;
    std::cout << '\n';
}
```

```output
newline only
newline and flush
no newline, but flushed
```

The output looks identical. The difference is *when* the characters actually leave your program.
The buffer is also flushed automatically:

- when the program ends normally (returning from `main`),
- when the buffer fills up,
- right before `std::cin` reads input (so a prompt like `"Enter a number: "` always appears before
  the program waits for you),
- in a terminal, often at each newline.

So you almost never need `std::endl`. Flushing thousands of times in a loop can make output-heavy
programs **many times slower**. **Prefer `'\n'`.** Use `std::endl` or `std::flush` only when you need
output to appear *right now*, e.g. a progress message before a long computation, or before a
possible crash.

## `std::cerr` and `std::clog`: the error channel

Normal results go to **stdout** (`std::cout`). Error messages, warnings, and diagnostics go to
**stderr**, using `std::cerr` (unbuffered, appears immediately) or `std::clog` (buffered, for
logging lots of messages).

```cpp run
#include <iostream>

int main() {
    std::cout << "result: 42\n";
    std::cerr << "warning: this goes to stderr\n";
    std::clog << "log: so does this\n";
}
```

On a terminal you see all three lines. But they travel on different channels. If you run the program
as `./prog > results.txt` (redirecting stdout to a file), the file contains only `result: 42`, and
the two stderr lines still appear on screen. That's the point: errors stay visible, and the real
output stays clean for other programs or files to consume.

> **Tip:** The exercise checker in this guide compares only **stdout**. You can print debugging
> information to `std::cerr` while working on an exercise, and it won't make the tests fail.

Because `std::cerr` is unbuffered, a message written to it appears even if the program crashes on
the very next line. That's exactly what you want from an error message.

> **Note:** Since stdout and stderr are separate channels, the order in which their lines appear
> relative to each other is not guaranteed when they are captured separately (for example, into a file
> or by an online IDE). Don't rely on interleaving.

:::quiz
What does this print?

```cpp
std::cout << true << ' ' << std::boolalpha << true << ' ' << false;
```

- [ ] `true true false`
- [x] `1 true false`
- [ ] `1 1 0`
- [ ] `true 1 0`

The first `true` is printed before `std::boolalpha` is inserted, so it prints as `1`. After that the
manipulator is in effect for the rest of the statement (and beyond).
:::

:::quiz
Which statements about `std::endl` are true? (select all that apply)

- [x] It inserts a newline
- [x] It flushes the output buffer
- [ ] It is required at the end of every program
- [ ] It is faster than `'\n'`

`std::endl` is `'\n'` plus a flush. The flush makes it slower, and the buffer is flushed anyway when
the program ends, so `'\n'` is the usual choice.
:::

:::quiz
Your program prints results with `std::cout` and error messages with `std::cerr`. A user runs
`./prog > out.txt`. What ends up in `out.txt`?

- [x] Only the results
- [ ] Only the error messages
- [ ] Both, interleaved
- [ ] Nothing; redirection only works for `std::clog`

`>` redirects stdout only. `std::cerr` writes to stderr, which still goes to the terminal.
:::

:::exercise Chained arithmetic
The starter reads two integers `a` and `b`. Using **one single `std::cout` statement** (chain with
`<<`, one semicolon), print two lines: their sum and their product.

**Input:** two integers `a` and `b`.
**Output:** exactly these two lines (with the actual numbers):

```
a + b = sum
a * b = product
```

For input `3 4` the output is:

```
3 + 4 = 7
3 * 4 = 12
```

```cpp starter
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;

    // print both lines with ONE std::cout statement
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;

    std::cout << a << " + " << b << " = " << a + b << '\n'
              << a << " * " << b << " = " << a * b << '\n';
}
```

```hint
A statement can continue over several lines. Start the continuation line with `<<` and put the only
semicolon at the very end.
```

```hint
Remember the spaces: `" + "` and `" = "` contain spaces on both sides.
```

```stdin
3 4
```

```expected
3 + 4 = 7
3 * 4 = 12
```

```stdin
-5 0
```

```expected hidden
-5 + 0 = -5
-5 * 0 = 0
```

```checks
must cout :: Print with std::cout.
mustnot cout[\s\S]*cout :: Use only one std::cout statement (chain everything with <<).
```
:::

:::exercise Comparisons as words
Read two integers `a` and `b` and print the results of three comparisons as `true` / `false`
(not `1` / `0`).

**Input:** two integers `a` and `b`.
**Output:** three lines, in this exact format (shown for input `3 4`):

```
3 == 4: false
3 < 4: true
3 > 4: false
```

```cpp starter
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;

    std::cout << a << " == " << b << ": " << (a == b) << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;

    std::cout << std::boolalpha;
    std::cout << a << " == " << b << ": " << (a == b) << '\n';
    std::cout << a << " < " << b << ": " << (a < b) << '\n';
    std::cout << a << " > " << b << ": " << (a > b) << '\n';
}
```

```hint
Insert `std::boolalpha` into `std::cout` once, before printing the comparisons.
```

```hint
Comparisons must be wrapped in parentheses when printed: `<< (a < b)`.
```

```stdin
3 4
```

```expected
3 == 4: false
3 < 4: true
3 > 4: false
```

```stdin
5 5
```

```expected
5 == 5: true
5 < 5: false
5 > 5: false
```

```stdin
-1 -2
```

```expected hidden
-1 == -2: false
-1 < -2: false
-1 > -2: true
```

```checks
must boolalpha :: Use std::boolalpha to print true/false.
```
:::

:::exercise Keep stdout clean
The starter prints a debug message to standard output, which pollutes the real output. Move the
debug message to **standard error** so that stdout contains only the result.

**Input:** one integer `n`.
**Output (stdout):** `Result: ` followed by `n * n`. For input `7`: `Result: 49`.
**Output (stderr):** `[debug] n = 7` (not checked, but print it there).

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << "[debug] n = " << n << '\n';
    std::cout << "Result: " << n * n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cerr << "[debug] n = " << n << '\n';
    std::cout << "Result: " << n * n << '\n';
}
```

```hint
`std::cerr` works exactly like `std::cout`, but writes to stderr.
```

```stdin
7
```

```expected
Result: 49
```

```stdin
-3
```

```expected hidden
Result: 9
```

```checks
must \bcerr\b|\bclog\b :: Send the debug message to std::cerr (or std::clog).
```
:::

:::exercise Type tour
Read a `char`, an `int`, and a `double`, then print information about them.

**Input:** a character `c`, an integer `i`, and a floating-point number `d`, separated by spaces.
**Output:** five lines, shown here for input `A 42 3.14159265`:

```
char: A
code: 65
next char: B
int: 42
double: 3.14159
```

- `code` is the character's numeric value.
- `next char` is the character whose code is one higher, printed **as a character**.
- Print the double with plain `<<` (default formatting, 6 significant digits).

```cpp starter
#include <iostream>

int main() {
    char c = ' ';
    int i = 0;
    double d = 0.0;
    std::cin >> c >> i >> d;

    std::cout << "char: " << c << '\n';
    std::cout << "code: " << c << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    char c = ' ';
    int i = 0;
    double d = 0.0;
    std::cin >> c >> i >> d;

    std::cout << "char: " << c << '\n';
    std::cout << "code: " << static_cast<int>(c) << '\n';
    std::cout << "next char: " << static_cast<char>(c + 1) << '\n';
    std::cout << "int: " << i << '\n';
    std::cout << "double: " << d << '\n';
}
```

```hint
To print a `char` as a number, convert it: `static_cast<int>(c)`.
```

```hint
`c + 1` is an `int`. Convert it back with `static_cast<char>(c + 1)` to print a character.
```

```stdin
A 42 3.14159265
```

```expected
char: A
code: 65
next char: B
int: 42
double: 3.14159
```

```stdin
z -7 1234567
```

```expected hidden
char: z
code: 122
next char: {
int: -7
double: 1.23457e+06
```
:::
