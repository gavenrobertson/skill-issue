---
title: Pointer Basics
summary: Declaring pointers, taking addresses, dereferencing with *, nullptr, and the classic pointer bugs (wild, null, and dangling pointers).
---

## A pointer is a variable that holds an address

You saw that `&x` gives the address of `x`. A **pointer** is simply a variable whose value is an
address. Its type says what kind of thing lives at that address:

```cpp
int x = 42;
int* p = &x;     // p is a "pointer to int", and it holds the address of x
```

```
     x (an int)                p (an int*)
   +------------+           +----------------+
   |     42     | <-------- | address of x   |
   +------------+           +----------------+
   at 0x...e2c              at 0x...e30
```

Read `int* p` as "**p is a pointer to int**". The pointer itself is a normal variable: it has its own
address and its own size (8 bytes on a 64-bit machine, no matter what it points to).

## Dereferencing: `*p`

To get at the thing a pointer points to, put `*` in front of it. This is called **dereferencing**
(or *indirection*): "go to the address stored in `p`".

```cpp run
#include <iostream>

int main() {
    int x = 42;
    int* p = &x;

    std::cout << "x  = " << x << '\n';
    std::cout << "*p = " << *p << '\n';         // read through the pointer

    *p = 100;                                   // write through the pointer
    std::cout << "after *p = 100, x = " << x << '\n';

    x = 7;                                      // change x directly...
    std::cout << "after x = 7, *p = " << *p << '\n';   // ...and *p sees it

    *p += 1;                                    // *p works anywhere x would
    std::cout << "after *p += 1, x = " << x << '\n';

    std::cout << "p == &x? " << (p == &x) << '\n';
}
```

```output
x  = 42
*p = 42
after *p = 100, x = 100
after x = 7, *p = 7
after *p += 1, x = 8
p == &x? 1
```

`*p` doesn't make a copy. It **is** `x`, reached by a different route. Changing one changes the other
because there's only one int in memory.

### Two meanings of `*` and `&`

The same symbols mean different things in declarations and expressions:

| Where | `*` means | `&` means |
| --- | --- | --- |
| In a declaration (`int* p`, `int& r`) | "p is a pointer" | "r is a reference" |
| In an expression (`*p`, `&x`) | "the thing p points to" (dereference) | "the address of x" |
| Between two values (`a * b`, `a & b`) | multiply | bitwise AND |

`&` and `*` are opposites: `*&x` is just `x`, and `&*p` is just `p`.

## Declaring pointers: every way to write it

Spacing around the `*` doesn't matter to the compiler:

```cpp
int* p1;     // C++ style: "int* is the type"
int *p2;     // C style: "*p2 is an int"
int * p3;    // also legal
```

But beware of declaring several variables in one line. The `*` belongs to **each name**, not to the type:

```cpp run
#include <iostream>

int main() {
    int value = 5;
    int* a = &value, b = 10;   // a is int*, but b is a plain int!
    int *c = &value, *d = &value;  // two pointers need two stars

    std::cout << *a << ' ' << b << ' ' << *c << ' ' << *d << '\n';
    std::cout << sizeof a << ' ' << sizeof b << '\n';
}
```

```output
5 10 5 5
8 4
```

`int* a, b;` looks like it declares two pointers, but `b` is an `int`. That's the reason many style
guides say: **one declaration per line**.

```cpp compile-error
int main() {
    int value = 5;
    int* a, b;
    a = &value;
    b = &value;   // error: invalid conversion from 'int*' to 'int'
}
```

A pointer's type must match what it points to. You can't point an `int*` at a `double`:

```cpp compile-error
int main() {
    double d = 3.14;
    int* p = &d;   // error: cannot convert 'double*' to 'int*'
}
```

And a pointer holds an *address*, not a number. Assigning a value instead of an address is an error:

```cpp compile-error
int main() {
    int x = 5;
    int* p = x;    // error: invalid conversion from 'int' to 'int*'
}
```

## `nullptr`: pointing at nothing

Sometimes a pointer has nothing to point to (yet). The special value **`nullptr`** (C++11) means
"points to nothing". Dereferencing a null pointer is **undefined behavior**; in practice it usually
crashes with a *segmentation fault*. So you check before you dereference:

```cpp run
#include <iostream>

int main() {
    int* p = nullptr;

    if (p == nullptr) {
        std::cout << "p points to nothing\n";
    }

    int x = 3;
    p = &x;              // a pointer can be re-pointed at any time

    if (p != nullptr) {  // explicit check
        std::cout << "p points to " << *p << '\n';
    }
    if (p) {             // short form: a pointer converts to bool (null is false)
        std::cout << "still pointing to " << *p << '\n';
    }
    if (!p) {
        std::cout << "never printed\n";
    }
}
```

```output
p points to nothing
p points to 3
still pointing to 3
```

### `nullptr` vs `NULL` vs `0`

Older code uses `NULL` or `0` for null pointers:

```cpp
int* a = nullptr;   // modern C++: always use this
int* b = NULL;      // C and pre-C++11 style. NULL is a macro, usually just 0
int* c = 0;         // the literal 0 also converts to a null pointer
```

Why `nullptr` is better: `NULL` and `0` are really **integers**, which causes surprises when a function
is overloaded for both `int` and a pointer. `nullptr` has its own type (`std::nullptr_t`) that converts
only to pointer types, so the compiler always knows what you mean:

```cpp run
#include <iostream>

void show(int) { std::cout << "show(int)\n"; }
void show(int*) { std::cout << "show(int*)\n"; }

int main() {
    show(0);         // 0 is an int, so this calls show(int)
    show(nullptr);   // unambiguous: show(int*)
}
```

```output
show(int)
show(int*)
```

(`show(NULL)` would be ambiguous or call the wrong overload, depending on the compiler.)

## The three classic pointer bugs

### 1. Uninitialized ("wild") pointers

A local pointer that isn't initialized holds a garbage address. Dereferencing it is undefined
behavior: it may crash, or silently scribble over some random memory.

```cpp
int* p;        // wild pointer: points who-knows-where
*p = 5;        // undefined behavior!
```

**Rule:** always initialize pointers, either to a real address or to `nullptr`.

### 2. Null pointer dereference

```cpp
int* p = nullptr;
std::cout << *p;   // undefined behavior, usually "Segmentation fault"
```

If a pointer *might* be null, check it first.

### 3. Dangling pointers

A **dangling pointer** holds the address of an object that **no longer exists**. The address is still
there, but the variable it belonged to is gone:

```cpp
int* p = nullptr;
{
    int temp = 10;
    p = &temp;        // fine so far
}                     // temp is destroyed here
std::cout << *p;      // undefined behavior: p dangles
```

This is the nastiest of the three, because the program often *seems* to work: the old bytes may still
hold `10` until something reuses them. Never keep a pointer to something that may die before the pointer.

> **Warning:** "It printed the right value" proves nothing when there's undefined behavior. The program
> is broken even if it looks fine today. Compile with `-fsanitize=address` on your own machine to make
> many of these bugs crash loudly.

## Pointers to pointers

A pointer is a variable, so it has an address, so you can point at it. A pointer to a pointer to an
int is an `int**`:

```cpp run
#include <iostream>

int main() {
    int x = 1;
    int* p = &x;      // p points to x
    int** pp = &p;    // pp points to p

    std::cout << **pp << '\n';  // follow two arrows: pp -> p -> x

    **pp = 2;                   // changes x
    std::cout << x << '\n';

    int y = 50;
    *pp = &y;                   // changes p itself: now p points to y
    std::cout << *p << '\n';
}
```

```output
1
2
50
```

```
   pp (int**)          p (int*)            x (int)
 +-----------+      +-----------+      +---------+
 | address p | ---> | address x | ---> |    1    |
 +-----------+      +-----------+      +---------+
```

You'll rarely need `int**` in modern C++, but you'll see it in C APIs (and in
`char** argv`, the command-line arguments of `main`).

:::quiz
What does this print?

```cpp
int a = 3;
int b = 8;
int* p = &a;
*p = 5;
p = &b;
*p += a;
std::cout << a << ' ' << b;
```

- [ ] `3 8`
- [ ] `5 8`
- [x] `5 13`
- [ ] `3 11`

`*p = 5` changes `a` to 5. Then `p` is re-pointed at `b`, and `*p += a` adds 5 to `b`, giving 13.
:::

:::quiz
After `int* a, b;`, what are the types of `a` and `b`?

- [ ] both `int*`
- [x] `a` is `int*`, `b` is `int`
- [ ] `a` is `int`, `b` is `int*`
- [ ] It doesn't compile

The `*` binds to the name that follows it, not to `int`. Write `int *a, *b;` (or better, two separate
declarations) to get two pointers.
:::

:::quiz
Which of these is a dangling pointer?

- [ ] `int* p = nullptr;`
- [ ] `int x = 1; int* p = &x;` while `x` is still in scope
- [x] A pointer to a local variable whose scope has already ended
- [ ] A pointer that was re-pointed to another variable

A dangling pointer points to an object that has been destroyed. A null pointer isn't dangling: it
clearly points to nothing, and you can test for it.
:::

:::exercise Change through a pointer {easy}
Read an integer `x`. Create a pointer `p` to `x`, and **using only the pointer** (not the name `x`),
multiply the value by 3 and then add 1. Finally print `x`.

**Input:** one integer.
**Output:** the new value of `x`, followed by a newline.

```cpp starter
#include <iostream>

int main() {
    int x;
    std::cin >> x;

    // create a pointer to x and modify x through it

    std::cout << x << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x;
    std::cin >> x;

    int* p = &x;
    *p = *p * 3;
    *p += 1;

    std::cout << x << '\n';
}
```

```hint
Declare it with `int* p = &x;`. Then `*p` means "the int that p points to".
```

```stdin
4
```

```expected
13
```

```stdin
0
```

```expected
1
```

```stdin
-5
```

```expected hidden
-14
```

```checks
must int\s*\*\s*\w+\s*=\s*&\s*x :: Create a pointer to x with int* p = &x;
must ^\s*\*\s*\w+\s*(\*|\+)?= :: Modify x through the pointer with *p = ... or *p += ...
```
:::

:::exercise Point at the bigger one {easy}
Read two integers `a` and `b`. Make a pointer point to whichever is **larger** (if they're equal,
point to `a`). Through the pointer, add 100 to that variable. Then print `a` and `b`.

**Input:** two integers `a b`.
**Output:** `a b` (the possibly-changed values, separated by a space), followed by a newline.

Example: `3 9` prints `3 109`.

```cpp starter
#include <iostream>

int main() {
    int a, b;
    std::cin >> a >> b;

    int* bigger = nullptr;
    // point bigger at a or b, then add 100 through it

    std::cout << a << ' ' << b << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a, b;
    std::cin >> a >> b;

    int* bigger = &a;
    if (b > a) {
        bigger = &b;
    }
    *bigger += 100;

    std::cout << a << ' ' << b << '\n';
}
```

```hint
Start with `bigger = &a;`, then re-point it with `bigger = &b;` if `b` is larger.
```

```stdin
3 9
```

```expected
3 109
```

```stdin
10 2
```

```expected
110 2
```

```stdin
7 7
```

```expected hidden
107 7
```

```stdin
-50 -60
```

```expected hidden
50 -60
```

```checks
must &\s*b :: Point at b with &b when it is bigger.
must ^\s*\*\s*\w+\s*\+= :: Add 100 through the pointer with *ptr += 100.
```
:::

:::exercise First negative {medium}
Read `n` followed by `n` integers into a `std::vector<int>`. Use an `int*` that starts as `nullptr`
and, while scanning the vector, point it at the **first** negative element.

If the pointer is still `nullptr` afterwards, print `none`. Otherwise print the negative value, then
set that element to `0` **through the pointer** and print the whole vector.

**Input:** `n` (0 or more), then `n` integers.
**Output:** either the single line `none`, or two lines:

```
<first negative value>
<all elements separated by single spaces>
```

Example: for `5` / `4 -2 7 -9 1` print `-2` then `4 0 7 -9 1`.

```cpp starter
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> values(n);
    for (int& v : values) {
        std::cin >> v;
    }

    int* found = nullptr;
    // point found at the first negative element

    std::cout << "none\n";
}
```

```cpp solution
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> values(n);
    for (int& v : values) {
        std::cin >> v;
    }

    int* found = nullptr;
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (values[i] < 0) {
            found = &values[i];
            break;
        }
    }

    if (found == nullptr) {
        std::cout << "none\n";
        return 0;
    }

    std::cout << *found << '\n';
    *found = 0;
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << values[i];
    }
    std::cout << '\n';
}
```

```hint
`&values[i]` is the address of element `i`. Stop at the first match with `break`.
```

```hint
After the loop, `if (found == nullptr)` (or `if (!found)`) tells you whether a negative was found.
```

```stdin
5
4 -2 7 -9 1
```

```expected
-2
4 0 7 -9 1
```

```stdin
3
1 2 3
```

```expected
none
```

```stdin
0
```

```expected hidden
none
```

```stdin
1
-8
```

```expected hidden
-8
0
```

```stdin
4
-1 -2 -3 -4
```

```expected hidden
-1
0 -2 -3 -4
```

```stdin
3
0 5 -2147483648
```

```expected hidden
-2147483648
0 5 0
```

```checks
must nullptr :: Start the pointer as nullptr.
must &\s*values\s*\[|&\s*\w+\s*\[ :: Take the address of an element with &values[i].
must ^\s*\*\s*found\s*= :: Set the element to 0 through the pointer (*found = 0).
```
:::
