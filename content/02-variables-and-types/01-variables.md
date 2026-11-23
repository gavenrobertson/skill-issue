---
title: Variables
summary: Named pieces of memory. Declaring, initializing and assigning, naming rules, keywords, conventions, reading input, and where a variable lives (scope).
---

## What is a variable?

Your computer's memory (RAM) is a giant row of numbered **bytes**. A program needs somewhere to keep
the numbers, letters and other data it works with. A **variable** is a **named piece of memory** with
a **type**:

- The **name** lets you refer to it (`age`) instead of a raw memory address (`0x7ffd5a3c`).
- The **type** (`int`, `double`, `char`, ...) tells the compiler how many bytes to reserve and what
  the bits mean: a whole number, a fractional number, a letter.
- The **value** is what's currently stored there. It can change while the program runs (it *varies*).

```
 name:   age          price
 type:   int          double
        ┌──────┐     ┌──────────────┐
 value: │  30  │     │    19.99     │
        └──────┘     └──────────────┘
         4 bytes        8 bytes
```

## Declaring a variable

A **declaration** introduces a name and its type. The basic form is `type name;`:

```cpp
int age;          // a whole number
double price;     // a number with a fractional part
char grade;       // a single character
bool isOpen;      // true or false
```

C++ is **statically typed**: a variable's type is fixed when you declare it and can never change.
`age` is an `int` forever. You must declare a variable **before** you use it:

```cpp compile-error
int main() {
    score = 10;   // error: 'score' was not declared in this scope
    int score;
}
```

## Initializing vs. assigning

There are two different ways to give a variable a value, and the difference matters in C++:

- **Initialization** gives a variable its value **at the moment it is created**, as part of the declaration.
- **Assignment** *replaces* the value of a variable that **already exists**, using `=` in a separate statement.

```cpp run
#include <iostream>

int main() {
    int apples = 5;      // initialization: created with the value 5
    std::cout << apples << '\n';

    apples = 8;          // assignment: the old value 5 is overwritten
    std::cout << apples << '\n';

    int pears;           // declared but NOT initialized
    pears = 3;           // first assignment
    std::cout << pears << '\n';

    apples = apples + pears;   // read the current values, then store the result
    std::cout << apples << '\n';
}
```

```output
5
8
3
11
```

Notice `apples = apples + pears;`. In math that equation is nonsense. In C++, `=` means **"store the
value on the right into the variable on the left"**: compute `8 + 3`, then put `11` into `apples`.

> **Warning:** A local variable declared without an initializer (like `int pears;`) holds **garbage**:
> whatever bits happened to be in that memory. Reading it before assigning a value is **undefined
> behavior**. Always initialize your variables. The next lessons show all the ways to do it.

There are several spellings of initialization (`int a = 5;`, `int a(5);`, `int a{5};`). They get a
whole lesson of their own (**Initialization**, later in this module). For now, `=` is fine.

## Reading a value from the keyboard

`std::cin` (**c**haracter **in**put) is the partner of `std::cout`. The **extraction operator** `>>`
reads a value from standard input and stores it in a variable, converting the text to the variable's type:

```cpp
int age{};
std::cin >> age;            // the user types 30, age becomes 30

int width{}, height{};
std::cin >> width >> height; // reads two values separated by spaces or newlines
```

`>>` skips leading whitespace (spaces, tabs, newlines), so `3 4`, `3    4` and `3` then Enter then `4`
all work the same. Exercises in this guide feed their test input through `std::cin`. Type something
into the **Input (stdin)** box in the IDE to try it yourself.

## Naming rules

An identifier (a name you create) must follow these rules, or the program won't compile:

1. It may contain **letters** (`a`-`z`, `A`-`Z`), **digits** (`0`-`9`) and **underscores** (`_`).
2. It must **not start with a digit**.
3. It must **not be a keyword** (a word reserved by the language, see below).
4. It is **case-sensitive**: `total`, `Total` and `TOTAL` are three different variables.

| Name | Valid? | Why |
| --- | --- | --- |
| `count` | ✓ | |
| `item2` | ✓ | digits are fine after the first character |
| `_temp` | ✓ | legal, but see the note below |
| `max_value` | ✓ | |
| `2ndPlace` | ✗ | starts with a digit |
| `my-var` | ✗ | `-` is the minus operator |
| `my var` | ✗ | no spaces |
| `int` | ✗ | keyword |
| `café` | ? | GCC accepts many Unicode letters, but stick to ASCII |

```cpp compile-error
int main() {
    int 2ndPlace = 2;   // error: expected unqualified-id before numeric constant
}
```

```cpp compile-error
int main() {
    int my-var = 3;     // error: the compiler sees "my minus var"
}
```

> **Note:** Names that **start with an underscore followed by a capital letter** (`_Size`) or that
> **contain a double underscore** anywhere (`my__var`) are reserved for the compiler and standard
> library. Names starting with a single underscore are reserved at global scope. Simplest rule: **don't
> start names with `_`**.

## Keywords

Keywords have a fixed meaning and can't be used as names. You'll meet most of them in this guide.
Some common ones:

| | | | | |
| --- | --- | --- | --- | --- |
| `auto` | `bool` | `break` | `case` | `char` |
| `class` | `const` | `constexpr` | `continue` | `default` |
| `delete` | `do` | `double` | `else` | `enum` |
| `false` | `float` | `for` | `if` | `int` |
| `long` | `namespace` | `new` | `nullptr` | `return` |
| `short` | `signed` | `sizeof` | `static` | `struct` |
| `switch` | `template` | `this` | `true` | `unsigned` |
| `using` | `void` | `while` | `and` | `or` |

```cpp compile-error
int main() {
    int class = 1;   // error: 'class' is a keyword
}
```

Words like `main`, `std`, `cout` and `string` are **not** keywords. They are ordinary names defined
by your program or the standard library.

## Naming conventions

The compiler doesn't care which style you use, but people do. Good names describe **what the value
means**: `elapsedSeconds` beats `t`, and `studentCount` beats `n` (except for tiny, obvious scopes).
Common styles:

| Style | Example | Typically used for |
| --- | --- | --- |
| camelCase | `studentCount` | variables and functions (many codebases) |
| snake_case | `student_count` | variables and functions (the standard library style) |
| PascalCase | `StudentRecord` | types (classes, structs) |
| SCREAMING_SNAKE_CASE | `MAX_STUDENTS` | macros (`#define`) |
| `k` prefix | `kMaxStudents` | constants (Google style) |

Pick one style per project and be consistent. This guide mostly uses camelCase for variables.

## Declaring several variables at once

You can declare several variables **of the same type** in one statement, separated by commas. Each
one gets its own initializer (or none):

```cpp run
#include <iostream>

int main() {
    int x = 1, y = 2, z = 3;     // three ints, each initialized
    double width = 2.5, height{4.0};
    int a, b = 10;               // careful: only b is initialized here!
    a = 7;

    std::cout << x << ' ' << y << ' ' << z << '\n';
    std::cout << width << ' ' << height << '\n';
    std::cout << a << ' ' << b << '\n';
}
```

```output
1 2 3
2.5 4
7 10
```

> **Pitfall:** `int a, b = 10;` does **not** set `a` to 10. The initializer belongs to `b` only.
> Many style guides recommend **one declaration per line** to avoid exactly this confusion.

## Scope: where a variable exists

A variable declared inside a block `{ ... }` is a **local variable**. Its **scope** (the region of
code where its name can be used) starts at its declaration and ends at the closing `}` of that block.
When execution leaves the block, the variable is destroyed.

```cpp run
#include <iostream>

int main() {
    int outer = 1;
    {
        int inner = 2;                       // inner exists only in this block
        std::cout << outer + inner << '\n';  // outer is visible here too
    }
    // std::cout << inner;  // error: 'inner' was not declared in this scope
    std::cout << outer << '\n';
}
```

```output
3
1
```

Inner blocks can see variables from outer blocks, but not the other way around. Two rules follow:

- You can't declare the **same name twice in the same scope**:

```cpp compile-error
int main() {
    int count = 1;
    int count = 2;   // error: redeclaration of 'int count'
}
```

- You **can** declare the same name in an inner block. The inner one **shadows** (hides) the outer one
  until the inner block ends. It's legal but confusing, so avoid it:

```cpp run
#include <iostream>

int main() {
    int value = 10;
    {
        int value = 99;                // a NEW variable that hides the outer one
        std::cout << value << '\n';   // 99
    }
    std::cout << value << '\n';       // 10: the outer one was never touched
}
```

```output
99
10
```

A variable declared **outside every function** is a **global variable**. It's visible from its
declaration to the end of the file and lives for the whole program. Globals are occasionally useful
for constants, but mutable globals make programs hard to reason about, so prefer locals.

:::quiz
Which of these are valid variable names? (select all that apply)

- [x] `total_score`
- [x] `player2`
- [ ] `2player`
- [ ] `double`
- [x] `numberOfItems`
- [ ] `first-name`

Names may contain letters, digits and underscores, must not start with a digit, and must not be a
keyword (`double` is one). `first-name` would be parsed as `first minus name`.
:::

:::quiz
What is the difference between these two lines?

```cpp
int a = 5;   // line 1
a = 5;       // line 2
```

- [x] Line 1 creates `a` and initializes it; line 2 assigns a new value to an existing `a`
- [ ] They are identical
- [ ] Line 1 is an assignment; line 2 is an initialization
- [ ] Line 2 creates a second variable named `a`

A declaration with a value is initialization. A bare `name = value;` is assignment to a variable that must already exist.
:::

:::quiz
What does this program print?

```cpp
int x = 1;
{
    int x = 2;
    x = x + 10;
}
std::cout << x;
```

- [x] `1`
- [ ] `2`
- [ ] `12`
- [ ] It does not compile

The inner `x` is a different variable that shadows the outer one. It becomes 12 and is destroyed at
`}`. The outer `x` is still 1.
:::

:::exercise Echo a number {easy}
Read one integer from standard input and print it back in a sentence.

**Input:** one integer `n`.
**Output:** `You entered n` followed by a newline. For input `42` print `You entered 42`.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    // read n with std::cin, then print the sentence
    std::cout << "You entered \n";
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << "You entered " << n << '\n';
}
```

```hint
`std::cin >> n;` reads a number into `n`. Then chain it into the output: `std::cout << "You entered " << n << '\n';`
```

```stdin
42
```

```expected
You entered 42
```

```stdin
-7
```

```expected hidden
You entered -7
```

```stdin
2147483647
```

```expected hidden
You entered 2147483647
```

```checks
must std::cin\s*>> :: Read the number with std::cin >>.
```
:::

:::exercise Swap two values {easy}
Read two integers into variables `a` and `b`. Swap their values **using a third temporary
variable**, then print `a` and `b` (in that order) separated by a space.

**Input:** two integers `a b`.
**Output:** the new `a`, a space, the new `b`, newline. For `3 8` print `8 3`.

```cpp starter
#include <iostream>

int main() {
    int a = 0;
    int b = 0;
    std::cin >> a >> b;

    // swap a and b here, using a temporary variable

    std::cout << a << ' ' << b << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0;
    int b = 0;
    std::cin >> a >> b;

    int temp = a;
    a = b;
    b = temp;

    std::cout << a << ' ' << b << '\n';
}
```

```hint
If you write `a = b;` first, the original value of `a` is lost. Save it first: `int temp = a;`
```

```hint
Three assignments: save `a` in `temp`, copy `b` into `a`, copy `temp` into `b`.
```

```stdin
3 8
```

```expected
8 3
```

```stdin
-5 0
```

```expected hidden
0 -5
```

```stdin
4 4
```

```expected hidden
4 4
```

```checks
mustnot std::swap|\bswap\s*\( :: Do the swap yourself with a temporary variable, not std::swap.
mustnot >>\s*b\s*>>\s*a :: Don't just read the numbers in the other order. Swap the variables.
```
:::

:::exercise Rectangle report {easy}
Read a rectangle's `width` and `height` (integers). Declare **all four** variables `width`, `height`,
`area` and `perimeter` **in a single declaration statement** (one `int`, separated by commas), then
compute and print:

**Input:** two integers `width height`.
**Output:** two lines, exactly:

```
area: <width * height>
perimeter: <2 * (width + height)>
```

```cpp starter
#include <iostream>

int main() {
    int width = 0;
    // declare the rest, read the input, compute and print
}
```

```cpp solution
#include <iostream>

int main() {
    int width = 0, height = 0, area = 0, perimeter = 0;
    std::cin >> width >> height;
    area = width * height;
    perimeter = 2 * (width + height);
    std::cout << "area: " << area << '\n';
    std::cout << "perimeter: " << perimeter << '\n';
}
```

```hint
One statement can declare several variables: `int a = 0, b = 0, c = 0;`
```

```hint
`*` multiplies. Use parentheses in `2 * (width + height)` so the addition happens first.
```

```stdin
3 4
```

```expected
area: 12
perimeter: 14
```

```stdin
0 5
```

```expected hidden
area: 0
perimeter: 10
```

```stdin
1000 1000
```

```expected hidden
area: 1000000
perimeter: 4000
```

```stdin
7 1
```

```expected hidden
area: 7
perimeter: 16
```

```checks
must \bint\s+width\b[^;]*,\s*height\b[^;]*,\s*area\b[^;]*,\s*perimeter\b :: Declare width, height, area and perimeter in one int declaration, in that order.
```
:::

:::exercise Shadowed total {medium}
A till program reads the price (in cents) and quantity of **two** items, each inside its own block,
and prints the grand total. It compiles, but the total is wrong: for `250 2 100 3` it prints
`total: 300` instead of `total: 800`. Find the scope bug and fix it. Keep both blocks, and keep the
`price` and `quantity` variables local to their blocks.

**Input:** four integers `price1 quantity1 price2 quantity2`.
**Output:** `total: <price1 * quantity1 + price2 * quantity2>`, newline.

```cpp starter
#include <iostream>

int main() {
    int total = 0;
    {
        int price = 0, quantity = 0;
        std::cin >> price >> quantity;
        int total = price * quantity;
    }
    {
        int price = 0, quantity = 0;
        std::cin >> price >> quantity;
        total = total + price * quantity;
    }
    std::cout << "total: " << total << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int total = 0;
    {
        int price = 0, quantity = 0;
        std::cin >> price >> quantity;
        total = total + price * quantity;
    }
    {
        int price = 0, quantity = 0;
        std::cin >> price >> quantity;
        total = total + price * quantity;
    }
    std::cout << "total: " << total << '\n';
}
```

```hint
Read the compiler's warnings: one variable is set but never used. Which `total` does the first block change?
```

```hint
`int total = ...;` inside a block declares a **new** variable that shadows the outer one and dies at
the `}`. To change the outer `total`, assign to it without `int`.
```

```stdin
250 2 100 3
```

```expected
total: 800
```

```stdin
0 5 7 0
```

```expected hidden
total: 0
```

```stdin
199 1 1 199
```

```expected hidden
total: 398
```

```stdin
1 1 1 1
```

```expected hidden
total: 2
```

```checks
mustnot \bint\s+total\b[\s\S]*\bint\s+total\b :: Declare total only once; the second declaration shadows the first.
```
:::
