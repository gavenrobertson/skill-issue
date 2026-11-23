---
title: auto and decltype
summary: Let the compiler figure out the type. How auto deduces types (and drops const and references), auto with literals, when to use it, decltype, and decltype(auto).
---

## auto: let the compiler deduce the type

Writing `auto` instead of a type tells the compiler: **"use the type of the initializer."** The type is
still fixed at compile time. `auto` doesn't make a variable dynamic like in Python or JavaScript; it
just saves you from writing the type yourself.

```cpp run
#include <iostream>

int main() {
    auto count = 10;          // int
    auto price = 4.99;        // double
    auto initial = 'J';       // char
    auto done = false;        // bool
    auto big = 10'000'000'000LL;   // long long

    std::cout << count << ' ' << price << ' ' << initial << ' ' << done << ' ' << big << '\n';
    // count = "hello";       // error: count is an int, forever
}
```

```output
10 4.99 J 0 10000000000
```

Since `auto` copies the type of the initializer, **an `auto` variable must have an initializer**:

```cpp compile-error
int main() {
    auto x;   // error: declaration of 'auto x' has no initializer
}
```

## auto with literals

Because the literal decides the type, suffixes matter a lot with `auto`:

| Declaration | Deduced type |
| --- | --- |
| `auto a = 5;` | `int` |
| `auto b = 5u;` | `unsigned int` |
| `auto c = 5L;` | `long` |
| `auto d = 5LL;` | `long long` |
| `auto e = 5.0;` | `double` |
| `auto f = 5.0f;` | `float` |
| `auto g = 'x';` | `char` |
| `auto h = true;` | `bool` |
| `auto i = "text";` | `const char*` (a pointer, **not** `std::string`!) |
| `auto j = std::string{"text"};` | `std::string` |
| `auto k = 1 + 2.5;` | `double` (the type of the whole expression) |

You can **prove** what the compiler deduced with `static_assert` and `std::is_same_v` from
`<type_traits>`. `static_assert(condition);` stops compilation if the condition is false, and
`std::is_same_v<A, B>` is `true` when `A` and `B` are the same type. If this program compiles, every
line in it is correct:

```cpp run
#include <iostream>
#include <string>
#include <type_traits>

int main() {
    auto a = 5;
    auto b = 5u;
    auto e = 5.0;
    auto f = 5.0f;
    auto i = "text";
    auto j = std::string{"text"};
    auto k = 1 + 2.5;

    static_assert(std::is_same_v<decltype(a), int>);
    static_assert(std::is_same_v<decltype(b), unsigned int>);
    static_assert(std::is_same_v<decltype(e), double>);
    static_assert(std::is_same_v<decltype(f), float>);
    static_assert(std::is_same_v<decltype(i), const char*>);
    static_assert(std::is_same_v<decltype(j), std::string>);
    static_assert(std::is_same_v<decltype(k), double>);

    std::cout << a << b << e << f << i << j << k << '\n';
}
```

```output
5555texttext3.5
```

(`decltype(a)` means "the type of `a`". It gets its own section below.)

> **Pitfall:** `auto total = 0;` is an `int`. If you later add `double`s to it, they get truncated.
> Write `auto total = 0.0;` when you want a `double`.

## auto drops const and references

`auto` deduces a **plain value type**: it makes a **copy**, and it throws away top-level `const` and
references. A **reference** (written `int&`) is another name for an existing variable; you'll study
them in depth later. Here's what that means:

```cpp run
#include <iostream>

int main() {
    const int limit = 100;
    auto copyOfLimit = limit;       // int, NOT const int: the copy is modifiable
    copyOfLimit = copyOfLimit + 1;

    int original = 5;
    int& alias = original;          // alias IS original (another name for it)
    auto copy = alias;              // int: a separate copy, the & is dropped
    copy = 99;                      // doesn't touch original

    std::cout << limit << ' ' << copyOfLimit << ' ' << original << ' ' << copy << '\n';
}
```

```output
100 101 5 99
```

If you **want** const or a reference, add it yourself. `auto` is then deduced around it:

```cpp run
#include <iostream>

int main() {
    int value = 10;

    auto& ref = value;          // int&: another name for value
    const auto& cref = value;   // const int&: read-only view of value
    const auto fixed = value;   // const int: a read-only copy

    ref = 20;                   // changes value
    std::cout << value << ' ' << cref << ' ' << fixed << '\n';
}
```

```output
20 20 10
```

```cpp compile-error
int main() {
    int value = 10;
    const auto& cref = value;
    cref = 5;          // error: assignment of read-only reference 'cref'
}
```

## auto with braces, and multiple variables

```cpp
auto a{5};        // int (since C++17)
auto b = {5};     // std::initializer_list<int>, a list type! Usually not what you want.
auto c = {1, 2};  // std::initializer_list<int>
```

`auto x{1, 2};` doesn't compile (one value only). And when you declare several variables with one
`auto`, they must all deduce the **same** type:

```cpp compile-error
int main() {
    auto width = 3, height = 4.5;   // error: inconsistent deduction for 'auto': 'int' and then 'double'
}
```

## When should I use auto?

Use it when the type is **obvious** from the right-hand side, or **long and noisy** to write:

```cpp
auto name = std::string{"Ada"};                       // type is right there
auto it = scores.begin();                             // instead of std::map<std::string, int>::iterator
auto ratio = static_cast<double>(hits) / attempts;    // the cast names the type
```

Avoid it when the exact type matters and isn't visible:

```cpp
auto size = 0;          // int, but sizes are usually std::size_t
auto msg = "hello";     // const char*, not std::string
auto result = compute(); // what type is this? the reader has to go look
```

Some teams follow "**almost always auto**"; others use it sparingly. Both are reasonable. The
important thing is understanding exactly what `auto` deduces.

## decltype: the type of an expression

`decltype(expr)` gives you the **type** of an expression without evaluating it. You can use it
anywhere a type is expected:

```cpp run
#include <iostream>

int main() {
    long long distance = 3'000'000'000;
    decltype(distance) doubled = distance * 2;    // long long, same as distance

    const int limit = 7;
    decltype(limit) alsoConst = 8;                // const int: decltype keeps const
    // alsoConst = 9;                             // error: read-only

    decltype(1 + 2.0) mixed = 1.5;                // double
    std::cout << doubled << ' ' << alsoConst << ' ' << mixed << '\n';
}
```

```output
6000000000 8 1.5
```

Unlike `auto`, `decltype` of a variable name gives its **exact declared type, including `const` and
references**. You'll use it mostly in templates, where you don't know types in advance.

> **Note:** There's a quirk: `decltype(x)` is the declared type of `x`, but `decltype((x))` (extra
> parentheses) treats `(x)` as an expression and gives a reference, `int&`. Avoid extra parentheses in `decltype`.

## decltype(auto)

`decltype(auto)` deduces the type from the initializer like `auto`, but using `decltype`'s rules,
so `const` and references are **kept**:

```cpp
const int limit = 5;
int x = 1;
int& rx = x;

auto a = limit;            // int
decltype(auto) b = limit;  // const int
auto c = rx;               // int (copy)
decltype(auto) d = rx;     // int& (reference to x)
```

It's mainly used for function return types in generic code. You won't need it for everyday variables.

:::quiz
What type does `x` have?

```cpp
const double rate = 0.5;
auto x = rate;
```

- [ ] `const double`
- [x] `double`
- [ ] `const double&`
- [ ] `float`

`auto` drops top-level `const` (and references): `x` is a modifiable copy.
:::

:::quiz
Which declarations deduce the type `double`? (select all that apply)

- [x] `auto a = 2.0;`
- [ ] `auto b = 2.0f;`
- [x] `auto c = 3 * 1.5;`
- [ ] `auto d = 7 / 2;`
- [ ] `auto e = 2;`

`2.0f` is a `float`, `7 / 2` is integer division of two `int`s (an `int`), and `2` is an `int`.
`3 * 1.5` is `int * double`, which gives a `double`.
:::

:::exercise Auto average
Read two integers and print their average **as a decimal number**. Store the average in a variable
declared with `auto`, and make sure the deduced type is `double` (hint: the literal you divide by decides it).

**Input:** two integers `a b`.
**Output:** the average, printed with plain `std::cout <<`, newline. For `3 4` print `3.5`; for `2 4` print `3`.

```cpp starter
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    auto average = (a + b) / 2;
    std::cout << average << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    auto average = (a + b) / 2.0;
    std::cout << average << '\n';
}
```

```hint
`(a + b) / 2` divides an `int` by an `int`, so `auto` deduces `int` and the `.5` is lost.
```

```hint
Divide by `2.0` instead: an `int` divided by a `double` is a `double`.
```

```stdin
3 4
```

```expected
3.5
```

```stdin
-1 0
```

```expected hidden
-0.5
```

```stdin
2 4
```

```expected hidden
3
```

```checks
must \bauto\s+\w+\s*= :: Store the average in an auto variable.
```
:::

:::exercise Copy or alias
Read an integer `n`. The program makes `copy`, a copy of `n`, and `alias`, which is supposed to be
**another name for `n` itself**, then adds 10 through `alias`. Right now `alias` is a copy too, so `n`
doesn't change. Fix the declaration of `alias` with `auto&`.

**Input:** one integer `n`.
**Output:** `n`, `copy` and `alias` separated by spaces, newline. For `5` print `15 5 15`.

```cpp starter
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    auto copy = n;
    auto alias = n;        // should refer to n itself
    alias = alias + 10;
    std::cout << n << ' ' << copy << ' ' << alias << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    auto copy = n;
    auto& alias = n;
    alias = alias + 10;
    std::cout << n << ' ' << copy << ' ' << alias << '\n';
}
```

```hint
`auto` makes a copy. `auto&` makes a reference: a second name for the same variable.
```

```stdin
5
```

```expected
15 5 15
```

```stdin
-10
```

```expected hidden
0 -10 0
```

```checks
must \bauto\s*&\s*alias :: Declare alias as auto&.
mustnot n\s*=\s*n\s*\+ :: Change n through alias, not directly.
```
:::

:::exercise Same type as
Read a (possibly very large) number into the `long long` variable `distance`. Declare a variable
`tripled` **using `decltype(distance)`** as its type, set it to three times `distance`, and print it.

**Input:** one integer (absolute value up to 3,000,000,000,000).
**Output:** three times the number, newline. For `3000000000` print `9000000000`.

```cpp starter
#include <iostream>

int main() {
    long long distance{};
    std::cin >> distance;
    // declare tripled with decltype(distance)
}
```

```cpp solution
#include <iostream>

int main() {
    long long distance{};
    std::cin >> distance;
    decltype(distance) tripled = distance * 3;
    std::cout << tripled << '\n';
}
```

```hint
`decltype(distance)` can be written anywhere you would write `long long`: `decltype(distance) tripled = ...;`
```

```stdin
3000000000
```

```expected
9000000000
```

```stdin
-4
```

```expected hidden
-12
```

```stdin
0
```

```expected hidden
0
```

```checks
must decltype\s*\(\s*distance\s*\)\s+tripled :: Declare tripled with decltype(distance).
```
:::
