---
title: Memory & Addresses
summary: Memory as a long row of numbered bytes, where variables live, the address-of operator &, sizeof, and the stack vs the heap.
---

Pointers are the topic that scares most C++ beginners. They're not hard once you have the right
picture in your head, so this lesson builds that picture first. No pointers yet, just **memory**.

## Memory is a long row of numbered bytes

While your program runs, its data lives in **RAM**. To a C++ program, memory looks like one huge row of
**bytes** (a byte is 8 bits, enough for a number from 0 to 255). Every byte has a number, called its
**address**, just like houses on a very long street:

```
 address:  ... 1000  1001  1002  1003  1004  1005  1006  1007 ...
           ...+-----+-----+-----+-----+-----+-----+-----+-----+...
  bytes:   ...| 00  | 00  | 00  | 2A  | 41  | ??  | ??  | ??  |...
           ...+-----+-----+-----+-----+-----+-----+-----+-----+...
```

A variable is a **named chunk of those bytes**. An `int` usually takes 4 bytes, so `int age = 42;`
might occupy bytes 1000 to 1003, and a `char` takes 1 byte, so `char grade = 'A';` might sit at 1004.
When you write `age`, the compiler knows "that's the 4 bytes starting at address 1000, read them as an int."

Two facts to remember:

- A variable's **address** is the address of its **first** byte.
- A variable's **type** says how many bytes it uses and how to interpret them.

## `sizeof`: how many bytes?

The `sizeof` operator tells you how many bytes a type or a variable occupies. It's computed at compile
time, so it costs nothing at run time.

```cpp run
#include <iostream>

int main() {
    std::cout << "char:        " << sizeof(char) << '\n';
    std::cout << "bool:        " << sizeof(bool) << '\n';
    std::cout << "short:       " << sizeof(short) << '\n';
    std::cout << "int:         " << sizeof(int) << '\n';
    std::cout << "long:        " << sizeof(long) << '\n';
    std::cout << "long long:   " << sizeof(long long) << '\n';
    std::cout << "float:       " << sizeof(float) << '\n';
    std::cout << "double:      " << sizeof(double) << '\n';
    std::cout << "long double: " << sizeof(long double) << '\n';

    int score = 7;
    std::cout << "score:       " << sizeof score << '\n';   // parentheses optional for a variable
    std::cout << "score + 1.0: " << sizeof(score + 1.0) << '\n'; // type of the expression is double

    int scores[10]{};
    std::cout << "int[10]:     " << sizeof scores << '\n';
    std::cout << "elements:    " << sizeof scores / sizeof scores[0] << '\n';
}
```

```output
char:        1
bool:        1
short:       2
int:         4
long:        8
long long:   8
float:       4
double:      8
long double: 16
score:       4
score + 1.0: 8
int[10]:     40
elements:    10
```

The numbers above are for 64-bit Linux, which is what this site's compiler uses. The standard only
guarantees `sizeof(char) == 1` and some minimums (an `int` is at least 16 bits, a `long` at least 32,
a `long long` at least 64). On 64-bit Windows, for example, `long` is 4 bytes, not 8.

Syntax variations:

- `sizeof(type)`: parentheses are **required** around a type name.
- `sizeof variable` or `sizeof(variable)`: either works for an expression.
- `sizeof` returns a `std::size_t`, an unsigned integer type.
- The expression inside `sizeof` is **not evaluated**: `sizeof(x++)` doesn't increment `x`.

> **Tip:** `sizeof array / sizeof array[0]` is the classic C way to count array elements. In modern
> C++ prefer `std::size(array)` (from `<iterator>`, also available through `<array>`, `<vector>` and `<string>`), which
> refuses to compile on a pointer instead of silently giving a wrong answer.

## The address-of operator `&`

Put `&` in front of a variable to get its address. Printing an address with `std::cout` shows it in
hexadecimal (base 16, prefixed with `0x`):

```cpp run
#include <iostream>

int main() {
    int age = 42;
    double height = 1.75;

    std::cout << "age    = " << age << " lives at " << &age << '\n';
    std::cout << "height = " << height << " lives at " << &height << '\n';
}
```

The output looks something like this, but **the addresses will be different on every run**:

```
age    = 42 lives at 0x7ffd5a3c1e2c
height = 1.75 lives at 0x7ffd5a3c1e30
```

Why do they change? Modern operating systems use **address space layout randomization (ASLR)**: they
deliberately place your program's memory at a random spot each run, which makes many security attacks
harder. So never write code that depends on a specific address value. What *is* reliable is the
relationship between addresses, for example that array elements sit next to each other.

> **Note:** The `&` symbol has several jobs in C++. In an **expression** like `&age` it means
> "address of". In a **declaration** like `int& r = age;` it means "reference" (later lesson). And
> between two values, `a & b` is bitwise AND. Context decides.

### Array elements are contiguous

An array's elements are stored **back to back** with no gaps. Each `int` element is 4 bytes after the
previous one:

```cpp run
#include <iostream>

int main() {
    int numbers[3]{10, 20, 30};

    for (int i = 0; i < 3; ++i) {
        std::cout << "numbers[" << i << "] = " << numbers[i] << " at " << &numbers[i] << '\n';
    }
}
```

Something like:

```
numbers[0] = 10 at 0x7ffc8e6a7d0c
numbers[1] = 20 at 0x7ffc8e6a7d10
numbers[2] = 30 at 0x7ffc8e6a7d14
```

In hex, `...0c`, `...10`, `...14` are 12, 16, 20: each address is exactly 4 (`sizeof(int)`) more than
the last. This contiguity is what makes arrays (and `std::vector`) so fast, and it's the basis of
pointer arithmetic in a couple of lessons.

### Printing the address of a `char`

There's one trap. `std::cout` treats a `char` address specially: it assumes it points to a C-style
string and prints characters until it finds a zero byte. For a single `char` that's
**undefined behavior** (it keeps reading memory that isn't yours):

```cpp
char letter = 'A';
std::cout << &letter;                       // WRONG: prints "A" followed by garbage (undefined behavior)
std::cout << static_cast<void*>(&letter);   // right: prints the address, like 0x7ffd...
```

Casting to `void*` ("pointer to unknown type") tells `std::cout` "just print the address".

## Where variables live: the stack and the heap

A running program's memory is divided into regions with different rules:

```
 high addresses
 +---------------------------+
 |  stack                    |  local variables, function parameters
 |   (grows down)            |  automatic: created and destroyed with their scope
 |            |              |
 |            v              |
 |                           |
 |            ^              |
 |            |              |
 |   (grows up)              |
 |  heap (free store)        |  memory you ask for at run time with new
 +---------------------------+
 |  static / global data     |  global variables, static variables, string literals
 +---------------------------+
 |  code                     |  your compiled functions
 +---------------------------+
 low addresses
```

**The stack** holds local variables and function parameters. When a function is called, a block of
stack space (a *stack frame*) is reserved for its locals. When the function returns, that space is
released instantly. It's extremely fast, and cleanup is automatic, but:

- it's small (typically 1 to 8 MB), so a huge local array like `int big[10'000'000];` can crash
  with a **stack overflow**;
- sizes must be known at compile time;
- everything in it dies when its scope ends.

**The heap** (C++ calls it the **free store**) is a large pool you request memory from at run time
with `new`, and give back with `delete`. It's slower to allocate, but objects there live as long as
you want, and sizes can be decided at run time. `std::vector` and `std::string` keep their elements
on the heap behind the scenes. You'll learn `new`/`delete` and the safer smart pointers later in this
module.

**Static storage** holds globals and `static` variables. They exist for the whole run of the program.

```cpp run
#include <iostream>
#include <vector>

int counter = 0;            // static storage: lives for the whole program

void work() {
    int local = 5;          // stack: created on each call, destroyed at the closing brace
    counter += local;
}

int main() {
    work();
    work();
    std::vector<int> data(1000, 1); // the vector object is on the stack,
                                    // its 1000 ints are on the heap
    std::cout << "counter = " << counter << '\n';
    std::cout << "data has " << data.size() << " elements\n";
}
```

```output
counter = 10
data has 1000 elements
```

### Lifetime: a variable's address is only valid while it exists

A local variable's memory is reused as soon as its scope ends. Remember this, because it's the root
of a whole family of bugs (dangling pointers and references) you'll meet in the next lessons:

```cpp
{
    int temp = 99;      // temp exists from here...
}                       // ...to here. Its bytes are now free for other uses.
// temp no longer exists; its old address points at "nothing in particular"
```

:::quiz
On this site's compiler (64-bit Linux), what does this print?

```cpp
double values[5]{};
std::cout << sizeof values;
```

- [ ] `5`
- [ ] `8`
- [x] `40`
- [ ] It depends on the values stored

`sizeof` on an array gives the size of the whole array in bytes: 5 elements × 8 bytes per `double` = 40.
The values stored don't matter; the size is fixed by the type.
:::

:::quiz
Why does `std::cout << &x` print a different number each time you run the same program?

- [ ] Variables move around in memory while the program runs
- [x] The operating system randomizes where the program's memory starts (ASLR)
- [ ] `&x` reads a random byte
- [ ] It's a compiler bug

Address space layout randomization places the stack, heap, and code at random locations on each run.
A variable stays at the same address for its whole lifetime; it's just a different address next run.
:::

:::quiz
Which of these live on the stack? (select all that apply)

- [x] A local `int` inside a function
- [x] A function's parameters
- [ ] A global variable
- [ ] Memory obtained with `new`

Locals and parameters are automatic (stack) variables. Globals live in static storage for the whole
program, and `new` allocates from the heap (free store).
:::

:::exercise Size lookup
Read one type name and print how many bytes it occupies, using `sizeof`.

**Input:** one word, one of: `char`, `bool`, `short`, `int`, `long`, `float`, `double`, `pointer`
(for `pointer`, report the size of an `int*`).
**Output:** the number of bytes, followed by a newline. For any other word, print `unknown`.

Use `sizeof` so your program would also be correct on a machine with different sizes.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string type;
    std::cin >> type;

    if (type == "char") {
        std::cout << 1 << '\n';
    }
    // handle the other types with sizeof
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string type;
    std::cin >> type;

    if (type == "char") std::cout << sizeof(char) << '\n';
    else if (type == "bool") std::cout << sizeof(bool) << '\n';
    else if (type == "short") std::cout << sizeof(short) << '\n';
    else if (type == "int") std::cout << sizeof(int) << '\n';
    else if (type == "long") std::cout << sizeof(long) << '\n';
    else if (type == "float") std::cout << sizeof(float) << '\n';
    else if (type == "double") std::cout << sizeof(double) << '\n';
    else if (type == "pointer") std::cout << sizeof(int*) << '\n';
    else std::cout << "unknown\n";
}
```

```hint
`sizeof(int)` is an expression you can print directly: `std::cout << sizeof(int) << '\n';`
```

```stdin
int
```

```expected
4
```

```stdin
double
```

```expected
8
```

```stdin
pointer
```

```expected hidden
8
```

```stdin
string
```

```expected hidden
unknown
```

```checks
must sizeof\s*\(\s*double\s*\) :: Use sizeof(double) instead of hard-coding the number.
must sizeof\s*\(\s*int\s*\*\s*\) :: Use sizeof(int*) for the pointer size.
```
:::

:::exercise Array footprint
A program wants to store `n` values. Read `n` and print how many bytes an array of `n` `int`s, `n`
`double`s, and `n` `char`s would occupy.

**Input:** one non-negative integer `n`.
**Output:** exactly three lines:

```
int: <bytes>
double: <bytes>
char: <bytes>
```

For `n = 3` that's `int: 12`, `double: 24`, `char: 3`.

```cpp starter
#include <iostream>

int main() {
    long long n;
    std::cin >> n;
    std::cout << "int: " << n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    long long n;
    std::cin >> n;
    std::cout << "int: " << n * sizeof(int) << '\n';
    std::cout << "double: " << n * sizeof(double) << '\n';
    std::cout << "char: " << n * sizeof(char) << '\n';
}
```

```hint
Multiply `n` by `sizeof(int)`, `sizeof(double)`, and `sizeof(char)`.
```

```stdin
3
```

```expected
int: 12
double: 24
char: 3
```

```stdin
0
```

```expected
int: 0
double: 0
char: 0
```

```stdin
1000000
```

```expected hidden
int: 4000000
double: 8000000
char: 1000000
```

```checks
must sizeof\s*\(\s*int\s*\) :: Use sizeof(int).
must sizeof\s*\(\s*double\s*\) :: Use sizeof(double).
```
:::

:::exercise Stack or heap?
A program's stack is limited, so large arrays should go on the heap. Read a count `n` and a type
name, compute how many bytes an array of `n` elements of that type needs, and decide where it should go.

**Input:** an integer `n` (0 or more) and a type name (`char`, `int`, or `double`), separated by a space.
**Output:** `<bytes> bytes: stack` if the array needs **at most 65536** bytes, otherwise
`<bytes> bytes: heap`.

Example: `100 double` prints `800 bytes: stack`.

```cpp starter
#include <iostream>
#include <string>

int main() {
    long long n;
    std::string type;
    std::cin >> n >> type;

    long long bytes = n;   // fix: multiply by the size of the element type
    std::cout << bytes << " bytes: stack\n";
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    long long n;
    std::string type;
    std::cin >> n >> type;

    long long elementSize = 0;
    if (type == "char") elementSize = sizeof(char);
    else if (type == "int") elementSize = sizeof(int);
    else if (type == "double") elementSize = sizeof(double);

    long long bytes = n * elementSize;
    std::cout << bytes << " bytes: " << (bytes <= 65536 ? "stack" : "heap") << '\n';
}
```

```hint
First pick the element size with `sizeof` based on the type name, then multiply by `n`.
```

```hint
Compare with `<=`: exactly 65536 bytes still counts as `stack`.
```

```stdin
100 double
```

```expected
800 bytes: stack
```

```stdin
16384 int
```

```expected
65536 bytes: stack
```

```stdin
16385 int
```

```expected hidden
65540 bytes: heap
```

```stdin
0 char
```

```expected hidden
0 bytes: stack
```

```checks
must sizeof :: Use sizeof to get the element size.
```
:::
