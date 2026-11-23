---
title: Unions & std::variant
summary: Store one of several types in the same space. Raw unions and why they're dangerous, tagged unions, std::variant with get, get_if, holds_alternative and visit, plus a glance at std::any.
---

A struct holds **all** of its members at once. Sometimes you need the opposite: a value that is **one of**
several types. A JSON value is a number *or* a string *or* a boolean. A shape is a circle *or* a
rectangle. A token is a number *or* an operator. C++ has a low-level tool for this, the `union`, and a
safe modern one, `std::variant`.

## Unions

A **union** looks like a struct, but all its members **share the same memory**. It's only as big as its
largest member, and only **one** member holds a meaningful value at a time: the one most recently
written, called the **active member**.

```cpp run
#include <iostream>

union Number {
    int i;
    double d;
};

struct Both {
    int i;
    double d;
};

int main() {
    std::cout << "union:  " << sizeof(Number) << " bytes\n";   // the size of its biggest member
    std::cout << "struct: " << sizeof(Both) << " bytes\n";     // room for both (plus padding)

    Number n;
    n.i = 42;                       // i is now the active member
    std::cout << n.i << '\n';

    n.d = 3.5;                      // d is now active; i's value is gone
    std::cout << n.d << '\n';
}
```

```output
union:  8 bytes
struct: 16 bytes
42
3.5
```

Writing `n.d` overwrote the same bytes that held `42`. That's fine as long as you only ever read the
member you wrote last. Here is the rule that makes unions dangerous:

> **Warning:** Reading a union member that is **not** the active one is **undefined behavior** in C++.
> After `n.d = 3.5;`, reading `n.i` doesn't give you "the bytes of 3.5 as an int", it gives you UB. (C
> allows this "type punning"; C++ does not. In C++20, use `std::bit_cast` from `<bit>` to reinterpret bytes.)

### Why raw unions are dangerous

1. **A union doesn't remember which member is active.** Nothing stops you from reading the wrong one,
   and the compiler can't check.
2. **Members with constructors and destructors** (like `std::string` or `std::vector`) don't work
   automatically: the union doesn't know which destructor to call, so you'd have to manage their
   lifetimes by hand. A union containing a `std::string` doesn't even compile without extra code.

### Tagged unions

The classic fix is to pair the union with an **enum tag** that records which member is active, and to
always check the tag before reading:

```cpp run
#include <iostream>

struct Value {
    enum class Kind { Int, Real } kind;
    union {            // an anonymous union: its members are accessed directly as v.i and v.d
        int i;
        double d;
    };
};

void print(const Value& v) {
    switch (v.kind) {
        case Value::Kind::Int:  std::cout << "int " << v.i << '\n'; break;
        case Value::Kind::Real: std::cout << "real " << v.d << '\n'; break;
    }
}

int main() {
    Value a;
    a.kind = Value::Kind::Int;
    a.i = 7;

    Value b;
    b.kind = Value::Kind::Real;
    b.d = 2.5;

    print(a);
    print(b);
}
```

```output
int 7
real 2.5
```

This works, but every write must update both the tag and the member, and every read must check the tag.
Forget once, and you have UB. You'll find tagged unions in C code, low-level libraries, and
memory-constrained systems. In everyday C++, use `std::variant`, which **is** a tagged union that the
library manages for you.

## `std::variant`

`std::variant<A, B, C>` (C++17, header `<variant>`) holds exactly **one** value whose type is one of
`A`, `B`, or `C`, and it always knows which. It handles constructors and destructors properly, so
`std::string` and other complex types are fine.

```cpp run
#include <iostream>
#include <string>
#include <variant>

int main() {
    std::variant<int, double, std::string> v;   // default: holds the FIRST type, value-initialized (int 0)
    std::cout << "index " << v.index() << '\n';

    v = 3.14;                                   // now holds a double
    std::cout << "index " << v.index() << '\n';

    v = std::string("hello");                   // now holds a std::string (the double is destroyed)
    std::cout << "index " << v.index() << '\n';

    v = 42;                                     // back to int
    std::cout << "index " << v.index() << '\n';
}
```

```output
index 0
index 1
index 2
index 0
```

`.index()` returns the position (0-based) of the type currently held. The types listed are called the
**alternatives**.

### Checking and reading the value

| Expression | Meaning |
| --- | --- |
| `std::holds_alternative<T>(v)` | `true` if `v` currently holds a `T` |
| `std::get<T>(v)` | the `T` inside; **throws** `std::bad_variant_access` if it holds something else |
| `std::get<I>(v)` | the same, by index |
| `std::get_if<T>(&v)` | a **pointer** to the `T` inside, or `nullptr` if it holds something else |

```cpp run
#include <iostream>
#include <string>
#include <variant>

int main() {
    std::variant<int, std::string> value = std::string("Ada");

    if (std::holds_alternative<std::string>(value)) {
        std::cout << "string: " << std::get<std::string>(value) << '\n';
    }

    value = 99;
    std::cout << "by index: " << std::get<0>(value) << '\n';

    // get_if takes a POINTER to the variant and returns a pointer (or nullptr)
    if (int* p = std::get_if<int>(&value)) {
        *p += 1;
        std::cout << "int: " << *p << '\n';
    }
    if (auto* s = std::get_if<std::string>(&value)) {
        std::cout << "never printed: " << *s << '\n';
    } else {
        std::cout << "not a string right now\n";
    }

    std::get<int>(value) = 5;            // std::get returns a reference: you can assign through it
    std::cout << std::get<int>(value) << '\n';
}
```

```output
string: Ada
by index: 99
int: 100
not a string right now
5
```

`std::get_if` is the most convenient for "if it's an X, do this": a check and access in one step,
with no exception.

Asking for a type that isn't an alternative at all is a compile error, so typos are caught early:

```cpp compile-error
#include <variant>

int main() {
    std::variant<int, double> v = 1;
    auto c = std::get<char>(v);   // error: char is not one of the alternatives
}
```

### Watch out for surprising conversions

Assigning a value picks the alternative it converts to best. A string literal is a `const char*`, which
matters if `bool` is one of the alternatives:

```cpp
std::variant<bool, std::string> v = "text";   // C++20: picks std::string (pre-C++20 compilers picked bool!)
std::variant<int, long> w = 5u;               // picks long: unsigned -> int would be a narrowing conversion
```

When in doubt, construct the exact type: `v = std::string("text");`.

## `std::visit`: handle every alternative

`std::visit(callable, v)` calls `callable` with whatever value `v` currently holds. The callable must
accept **every** alternative. The easiest callable is a **lambda**: a small unnamed function written
inline. You'll learn lambdas properly in a later module; for now, the shape is
`[](parameters) { body }`.

With an `auto` parameter, a single lambda accepts any type:

```cpp run
#include <iostream>
#include <string>
#include <variant>
#include <vector>

int main() {
    std::vector<std::variant<int, double, std::string>> items{1, 2.5, std::string("three")};

    for (const auto& item : items) {
        std::visit([](const auto& x) { std::cout << x << '\n'; }, item);
    }
}
```

```output
1
2.5
three
```

### Overloaded lambdas (brief)

To do something **different** for each type, a common idiom combines several lambdas into one object
using a tiny helper. Copy the helper as-is; how it works is covered in the templates module:

```cpp run
#include <iostream>
#include <string>
#include <variant>
#include <vector>

// The "overloaded" helper: merges several lambdas into one callable with several overloads.
template <class... Ts>
struct overloaded : Ts... {
    using Ts::operator()...;
};

struct Circle { double radius; };
struct Rect { double width, height; };

using Shape = std::variant<Circle, Rect>;

int main() {
    std::vector<Shape> shapes{Circle{1.0}, Rect{2.0, 3.0}, Circle{0.5}};

    for (const Shape& s : shapes) {
        double area = std::visit(overloaded{
            [](const Circle& c) { return 3.14159 * c.radius * c.radius; },
            [](const Rect& r) { return r.width * r.height; },
        }, s);
        std::cout << area << '\n';
    }
}
```

```output
3.14159
6
0.785397
```

If you forget an alternative, it doesn't compile, so `std::visit` guarantees every case is handled.
(Notice that `std::visit` returns whatever the lambdas return.)

### A variant that may be empty: `std::monostate`

A variant always holds one of its alternatives. If you want an "empty" state, add `std::monostate`
(an empty placeholder type) as the first alternative: `std::variant<std::monostate, int, std::string>`
starts out holding `monostate`.

## `std::any` (brief mention)

`std::any` (C++17, `<any>`) can hold a value of **any** copyable type at all, with the type decided at
run time. You get the value back with `std::any_cast<T>`:

```cpp run
#include <any>
#include <iostream>
#include <string>

int main() {
    std::any box = 42;
    std::cout << std::any_cast<int>(box) << '\n';

    box = std::string("now a string");
    if (auto* s = std::any_cast<std::string>(&box)) {   // pointer form: nullptr if wrong type
        std::cout << *s << '\n';
    }
    std::cout << box.has_value() << '\n';
}
```

```output
42
now a string
1
```

It's rarely the right tool: the compiler can't check what's inside, and it may allocate on the heap.
If you know the list of possible types, `std::variant` is safer and faster.

## Which one?

| Tool | Holds | Knows what it holds? | Use for |
| --- | --- | --- | --- |
| `union` | one of a fixed set of simple types | no | low-level code, C interop, extreme memory constraints |
| tagged union (struct + enum + union) | same | yes, if you're careful | the same, when you need the tag |
| `std::variant` | one of a fixed set of any types | yes, enforced | everyday "one of these types" values |
| `std::any` | any type at all | at run time only | rare: truly unknown types |

:::quiz
`union U { int i; double d; };` After `U u; u.d = 1.5;`, what happens if you read `u.i`?

- [ ] You get 1
- [ ] You get the bytes of 1.5 interpreted as an int, guaranteed
- [x] Undefined behavior, because `i` is not the active member
- [ ] Compile error

Only the most recently written member is active. Reading another member is undefined behavior in C++.
:::

:::quiz
Given `std::variant<int, std::string> v = 10;`, which are true? (select all that apply)

- [x] `v.index()` is `0`
- [x] `std::holds_alternative<int>(v)` is `true`
- [x] `std::get_if<std::string>(&v)` returns `nullptr`
- [ ] `std::get<std::string>(v)` returns an empty string

`v` holds an `int` (alternative 0). `std::get<std::string>(v)` would throw `std::bad_variant_access`,
not return an empty string.
:::

:::exercise Tagged value
Use the tagged-union pattern from the lesson:

```cpp
struct Value {
    enum class Kind { Int, Real } kind;
    union { int i; double d; };
};
```

Read `n` items, each either `int <whole number>` or `real <decimal>`. Store each in a `Value` (set the tag
**and** the matching member), keep them in a `std::vector<Value>`, then print every item doubled.

**Input:** `n`, then `n` lines like `int 5` or `real 2.5`.
**Output:** one line per item: `int <2x>` or `real <2x>` (print the double with plain `std::cout <<`).

```cpp starter
#include <iostream>
#include <string>
#include <vector>

struct Value {
    enum class Kind { Int, Real } kind;
    union {
        int i;
        double d;
    };
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Value> values;
    for (int k = 0; k < n; ++k) {
        std::string type;
        std::cin >> type;
        // read the number into the right member and set the tag
    }
    std::cout << values.size() << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

struct Value {
    enum class Kind { Int, Real } kind;
    union {
        int i;
        double d;
    };
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Value> values;
    for (int k = 0; k < n; ++k) {
        std::string type;
        std::cin >> type;
        Value v;
        if (type == "int") {
            v.kind = Value::Kind::Int;
            std::cin >> v.i;
        } else {
            v.kind = Value::Kind::Real;
            std::cin >> v.d;
        }
        values.push_back(v);
    }

    for (const Value& v : values) {
        switch (v.kind) {
            case Value::Kind::Int:  std::cout << "int " << v.i * 2 << '\n'; break;
            case Value::Kind::Real: std::cout << "real " << v.d * 2 << '\n'; break;
        }
    }
}
```

```hint
Set the tag and read into the matching member together: `v.kind = Value::Kind::Int; std::cin >> v.i;`.
```

```hint
When printing, `switch (v.kind)` and only read the member that matches the tag.
```

```stdin
3
int 5
real 2.5
int -4
```

```expected
int 10
real 5
int -8
```

```stdin
1
real 0.25
```

```expected
real 0.5
```

```stdin
0
```

```expected hidden

```

```checks
must union :: Keep the union inside Value.
must Value::Kind::Real :: Set and check the tag (Value::Kind::Real).
mustnot std::variant :: Practice the tagged union here, not std::variant.
```
:::

:::exercise Number or word
Read whitespace-separated tokens until the input ends. Store each in a `std::variant<int, std::string>`:
an `int` if the token consists only of digits (at most 9 of them), otherwise the `std::string`. Then go
through the variants and print each one, using `std::holds_alternative` and `std::get`.

**Input:** zero or more tokens.
**Output:** one line per token: `number <n>` for ints (so `007` prints as `number 7`), or `word <text>`.

```cpp starter
#include <iostream>
#include <string>
#include <variant>
#include <vector>

int main() {
    std::vector<std::variant<int, std::string>> tokens;
    std::string t;
    while (std::cin >> t) {
        tokens.push_back(t);
    }
    for (const auto& tok : tokens) {
        std::cout << "word " << std::get<std::string>(tok) << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <string>
#include <variant>
#include <vector>

bool allDigits(const std::string& s) {
    if (s.empty()) return false;
    for (char c : s) {
        if (c < '0' || c > '9') return false;
    }
    return true;
}

int main() {
    std::vector<std::variant<int, std::string>> tokens;
    std::string t;
    while (std::cin >> t) {
        if (allDigits(t)) {
            tokens.push_back(std::stoi(t));
        } else {
            tokens.push_back(t);
        }
    }
    for (const auto& tok : tokens) {
        if (std::holds_alternative<int>(tok)) {
            std::cout << "number " << std::get<int>(tok) << '\n';
        } else {
            std::cout << "word " << std::get<std::string>(tok) << '\n';
        }
    }
}
```

```hint
Write a helper `bool allDigits(const std::string& s)`. For digit tokens, `std::stoi(t)` converts to an
`int`, and `push_back` of an `int` stores the int alternative.
```

```hint
When printing: `if (std::holds_alternative<int>(tok)) ... std::get<int>(tok) ...`.
```

```stdin
abc 42 x1 007
```

```expected
word abc
number 42
word x1
number 7
```

```stdin
hello
```

```expected
word hello
```

```stdin
-5 0 12a
```

```expected hidden
word -5
number 0
word 12a
```

```checks
must std::variant\s*<\s*int\s*,\s*std::string\s*> :: Store tokens as std::variant<int, std::string>.
must std::holds_alternative\s*<\s*int\s*> :: Check the active type with std::holds_alternative<int>.
must std::get\s*<\s*int\s*> :: Read the int with std::get<int>.
```
:::

:::exercise Total area with visit
Shapes are stored as `using Shape = std::variant<Circle, Rect, Square>;` (the structs are given). Read
the shapes, then compute the **total area** with `std::visit` and the `overloaded` helper. Use
`3.14159265358979` for π.

**Input:** `n`, then `n` lines: `circle <radius>`, `rect <width> <height>`, or `square <side>`.
**Output:** the total area with exactly 2 decimal places (`std::fixed` and `std::setprecision(2)` from
`<iomanip>`), followed by a newline.

```cpp starter
#include <iomanip>
#include <iostream>
#include <string>
#include <variant>
#include <vector>

template <class... Ts>
struct overloaded : Ts... {
    using Ts::operator()...;
};

struct Circle { double radius; };
struct Rect { double width, height; };
struct Square { double side; };

using Shape = std::variant<Circle, Rect, Square>;

int main() {
    int n;
    std::cin >> n;
    std::vector<Shape> shapes;
    for (int i = 0; i < n; ++i) {
        std::string kind;
        std::cin >> kind;
        if (kind == "circle") {
            double r;
            std::cin >> r;
            shapes.push_back(Circle{r});
        } else if (kind == "rect") {
            double w, h;
            std::cin >> w >> h;
            shapes.push_back(Rect{w, h});
        } else {
            double s;
            std::cin >> s;
            shapes.push_back(Square{s});
        }
    }

    double total = 0;
    // add up the areas with std::visit
    std::cout << std::fixed << std::setprecision(2) << total << '\n';
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <string>
#include <variant>
#include <vector>

template <class... Ts>
struct overloaded : Ts... {
    using Ts::operator()...;
};

struct Circle { double radius; };
struct Rect { double width, height; };
struct Square { double side; };

using Shape = std::variant<Circle, Rect, Square>;

int main() {
    int n;
    std::cin >> n;
    std::vector<Shape> shapes;
    for (int i = 0; i < n; ++i) {
        std::string kind;
        std::cin >> kind;
        if (kind == "circle") {
            double r;
            std::cin >> r;
            shapes.push_back(Circle{r});
        } else if (kind == "rect") {
            double w, h;
            std::cin >> w >> h;
            shapes.push_back(Rect{w, h});
        } else {
            double s;
            std::cin >> s;
            shapes.push_back(Square{s});
        }
    }

    double total = 0;
    for (const Shape& shape : shapes) {
        total += std::visit(overloaded{
            [](const Circle& c) { return 3.14159265358979 * c.radius * c.radius; },
            [](const Rect& r) { return r.width * r.height; },
            [](const Square& s) { return s.side * s.side; },
        }, shape);
    }
    std::cout << std::fixed << std::setprecision(2) << total << '\n';
}
```

```hint
`std::visit(overloaded{ lambda1, lambda2, lambda3 }, shape)` calls the lambda whose parameter type matches
what `shape` holds. Each lambda returns that shape's area.
```

```hint
One lambda looks like `[](const Rect& r) { return r.width * r.height; }`. You need one for each of the
three shapes.
```

```stdin
3
circle 1
rect 2 3
square 2
```

```expected
13.14
```

```stdin
1
square 0
```

```expected
0.00
```

```stdin
2
circle 2.5
rect 0.5 4
```

```expected hidden
21.63
```

```checks
must std::visit :: Compute the areas with std::visit.
must overloaded\s*\{ :: Combine the lambdas with the overloaded helper.
```
:::
