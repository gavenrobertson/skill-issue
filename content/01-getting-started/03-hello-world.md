---
title: Hello, World! Line by Line
summary: The anatomy of a C++ program, every variation of printing text, and what each symbol means.
---

## The program

```cpp run
#include <iostream>

int main() {
    std::cout << "Hello, World!\n";
    return 0;
}
```

```output
Hello, World!
```

Seven lines, and every one matters. Let's take it apart.

## `#include <iostream>`

A **preprocessor directive** (anything starting with `#`). It brings in the declarations from the
standard header `<iostream>` ("input/output stream"), which defines `std::cout` (console output) and
`std::cin` (console input). Without it, the compiler has never heard of `std::cout`:

```cpp compile-error
int main() {
    std::cout << "Hello\n";   // error: 'cout' is not a member of 'std'
}
```

Standard library headers use angle brackets `<...>`. Your own header files use quotes: `#include "myfile.h"`.

## `int main() { ... }`

Every C++ program has exactly one function named **`main`**, and that's where execution starts.

- `int` is the **return type**: `main` gives an integer back to the operating system when it finishes.
  `0` means "success"; anything else means "something went wrong".
- `main` is the name. It must be exactly `main`, lowercase.
- `()` is the (here empty) **parameter list**.
- `{ ... }` is the **body**: the statements that run, top to bottom.

Two forms of `main` are allowed by the standard:

```cpp
int main() { /* ... */ }
int main(int argc, char* argv[]) { /* ... */ }   // receives command-line arguments
```

`void main()` is **not** valid C++, even though some old tutorials show it.

## `std::cout << "Hello, World!\n";`

- `std::cout` is the **standard character output stream**, normally your terminal (here, the output panel).
- `std::` means "from the **std** namespace". The standard library puts its names inside a namespace
  called `std` so they don't collide with yours. `::` is the **scope resolution operator**.
- `<<` is the **insertion operator**: "send this into the stream". You can chain it.
- `"Hello, World!\n"` is a **string literal**: text between double quotes.
- `\n` is an **escape sequence** meaning *newline*.
- `;` ends the **statement**. Forgetting semicolons is the #1 beginner compile error.

## `return 0;`

Ends `main` and reports success. `main` is special: if you leave out `return 0;`, the compiler
acts as if it were there. Many programs (including most in this guide) omit it. No other function
gets this exception.

## Every way to print

```cpp run
#include <iostream>

int main() {
    // 1. One string
    std::cout << "one\n";

    // 2. Chaining several items with <<
    std::cout << "two" << " and " << "three" << '\n';

    // 3. Numbers print directly, no quotes needed
    std::cout << 42 << ' ' << 3.14 << '\n';

    // 4. std::endl ends the line AND flushes the output buffer
    std::cout << "four" << std::endl;

    // 5. A statement can span several lines; it ends at the semicolon
    std::cout << "five, "
              << "split "
              << "across lines\n";

    // 6. Adjacent string literals are glued together by the compiler
    std::cout << "six " "is " "joined\n";
}
```

```output
one
two and three
42 3.14
four
five, split across lines
six is joined
```

**`'\n'` vs `"\n"` vs `std::endl`**: `'\n'` is a single *character* (single quotes), `"\n"` is a
*string* containing one character. Both print a newline. `std::endl` prints a newline **and flushes**
(forces the output to be written immediately), which is slower when done a lot. Prefer `'\n'`.

## Escape sequences

Some characters can't be typed directly inside a string literal, so they're written with a backslash:

| Escape | Meaning |
| --- | --- |
| `\n` | newline |
| `\t` | tab |
| `\\` | a backslash |
| `\"` | a double quote |
| `\'` | a single quote |
| `\0` | the null character (value 0) |

```cpp run
#include <iostream>

int main() {
    std::cout << "Name:\tAda\n";
    std::cout << "She said \"hi\"\n";
    std::cout << "C:\\Users\\ada\n";
    std::cout << R"(Raw string: no \n escapes, "quotes" are fine)" << '\n';
}
```

```output
Name:	Ada
She said "hi"
C:\Users\ada
Raw string: no \n escapes, "quotes" are fine
```

The last line uses a **raw string literal** `R"( ... )"`, where backslashes are not special. Handy for
file paths and regular expressions.

## `using namespace std;`

You'll often see:

```cpp run
#include <iostream>
using namespace std;

int main() {
    cout << "No std:: needed\n";
}
```

`using namespace std;` dumps every name from `std` into your program so you can drop the `std::`. It's
fine for tiny programs and many classes use it, but in real code it's discouraged: `std` contains
hundreds of names (`count`, `distance`, `max`, ...) that can clash with yours. A middle ground is a
**using-declaration** that imports just one name:

```cpp run
#include <iostream>
using std::cout;

int main() {
    cout << "Only cout was imported\n";
}
```

This guide writes `std::` explicitly. You'll read code in all three styles, so know them all.

:::quiz
What is wrong with this line?

```cpp
std::cout << "Hello" << '\n'
```

- [ ] `'\n'` must use double quotes
- [x] It is missing a semicolon
- [ ] You can't chain `<<`
- [ ] Nothing

Every statement ends with `;`. The compiler will report something like `expected ';' before '}' token`.
:::

:::quiz
Which of these are valid ways to write `main`? (select all that apply)

- [x] `int main() { }`
- [x] `int main(int argc, char* argv[]) { }`
- [ ] `void main() { }`
- [ ] `int Main() { }`

Only `int main()` and `int main(int argc, char* argv[])` (or the equivalent `char** argv`) are standard.
Names are case-sensitive, so `Main` is a different function.
:::

:::exercise Hello, You
Print exactly these two lines:

```
Hello, World!
Welcome to C++.
```

```cpp starter
#include <iostream>

int main() {

}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "Hello, World!\n";
    std::cout << "Welcome to C++.\n";
}
```

```hint
Use `std::cout << "text\n";` once per line, or chain them with `<<`.
```

```expected
Hello, World!
Welcome to C++.
```

```checks
must std::cout|cout :: Print using std::cout.
```
:::

:::exercise Escape artist
Print exactly this (it contains a tab between `Path:` and the path, double quotes, and backslashes):

```
Path:	C:\code\main.cpp
Say "C++" out loud.
```

Use escape sequences (`\t`, `\\`, `\"`), not a raw string.

```cpp starter
#include <iostream>

int main() {
    std::cout << "Path: C:code\main.cpp\n";
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "Path:\tC:\\code\\main.cpp\n";
    std::cout << "Say \"C++\" out loud.\n";
}
```

```hint
A backslash inside a string must be written as `\\`, a tab as `\t`, and a double quote as `\"`.
```

```expected
Path:	C:\code\main.cpp
Say "C++" out loud.
```

```checks
mustnot R" :: Use escape sequences instead of a raw string literal.
```
:::

:::exercise ASCII box
Use **a single statement** (one `std::cout` with chained `<<`, ending in one semicolon) to print this box:

```
+-----+
| C++ |
+-----+
```

```cpp starter
#include <iostream>

int main() {
    std::cout << "+-----+\n";
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "+-----+\n"
              << "| C++ |\n"
              << "+-----+\n";
}
```

```hint
A statement can span multiple lines. Put `<<` at the start of each continuation line and only one `;` at the very end.
```

```expected
+-----+
| C++ |
+-----+
```

```checks
mustnot cout[\s\S]*cout :: Use only one std::cout statement (chain with <<).
```
:::
