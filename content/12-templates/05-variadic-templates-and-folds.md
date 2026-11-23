---
title: Variadic Templates & Fold Expressions
summary: Templates that take any number of arguments, parameter packs, sizeof..., recursive expansion, all four fold expressions, and a first look at perfect forwarding.
---

## Any number of arguments

How would you write `sum(1, 2)`, `sum(1, 2, 3)` and `sum(1, 2.5, 3, 4)` with one function? A normal
template has a fixed number of parameters. A **variadic template** accepts **zero or more**:

```cpp run
#include <iostream>

template <typename... Ts>
auto sum(Ts... values) {
    return (values + ...);        // a fold expression: values1 + (values2 + (...))
}

int main() {
    std::cout << sum(1, 2) << '\n';
    std::cout << sum(1, 2, 3) << '\n';
    std::cout << sum(1, 2.5, 3, 4) << '\n';
}
```

```output
3
6
10.5
```

The `...` (ellipsis) is the key piece of syntax, and where it goes matters:

| Code | Meaning |
| --- | --- |
| `typename... Ts` | a **template parameter pack**: zero or more types, named `Ts` |
| `Ts... values` | a **function parameter pack**: one parameter for each type in `Ts` |
| `values...` | a **pack expansion**: "repeat this pattern for every element", comma-separated |
| `sizeof...(Ts)` | how many elements the pack has (a compile-time constant) |

For `sum(1, 2.5, 3)` the compiler deduces `Ts = {int, double, int}` and generates a function with three
parameters. Like all templates, each different list of types is a separate instantiation.

## `sizeof...` and expanding packs

A pack can't be used as a single value. You **expand** it by writing a pattern followed by `...`, and
the compiler repeats the pattern once per element, separated by commas:

```cpp run
#include <iostream>
#include <string>
#include <vector>

void show3(int a, int b, int c) { std::cout << a << ' ' << b << ' ' << c << '\n'; }

template <typename... Ts>
void info(Ts... args) {
    std::cout << sizeof...(Ts) << " types, " << sizeof...(args) << " args\n";
}

template <typename... Ts>
void demo(Ts... args) {
    show3(args...);              // show3(a1, a2, a3)
    show3((args * 10)...);       // show3(a1 * 10, a2 * 10, a3 * 10): the whole pattern repeats
    std::vector<int> v{args...}; // also works inside braces
    std::cout << "vector size " << v.size() << '\n';
}

int main() {
    info();
    info(1, "two", 3.0);
    demo(1, 2, 3);
}
```

```output
0 types, 0 args
3 types, 3 args
1 2 3
10 20 30
vector size 3
```

Packs can also come after normal parameters: `template <typename First, typename... Rest> void f(First
first, Rest... rest)`. That's the key to the recursive style below.

Like other template parameters, pass large objects by reference: `const Ts&... args` makes every
parameter a `const` reference.

## Recursive expansion (the pre-C++17 way)

Before C++17 there were no fold expressions. The standard trick: peel off the **first** argument,
handle it, and call yourself with the **rest**. A non-variadic overload ends the recursion:

```cpp run
#include <iostream>
#include <string>

void print() {                         // base case: no arguments left
    std::cout << '\n';
}

template <typename First, typename... Rest>
void print(const First& first, const Rest&... rest) {
    std::cout << first;
    if (sizeof...(rest) > 0) std::cout << ", ";
    print(rest...);                    // recurse with one fewer argument
}

int main() {
    print(1, "two", 3.5, std::string("four"));
    print('x');
}
```

```output
1, two, 3.5, four
x
```

For `print(1, "two", 3.5)`, the compiler generates `print<int, const char*, double>`, which calls
`print<const char*, double>`, which calls `print<double>`, which calls the plain `print()`.

Without the base case, the last step `print()` with no arguments finds no function:

```cpp compile-error
#include <iostream>

template <typename First, typename... Rest>
void print(const First& first, const Rest&... rest) {
    std::cout << first;
    print(rest...);          // eventually print() with no arguments: no matching function
}

int main() {
    print(1, 2, 3);
}
```

(In C++17 you can avoid the separate base case with `if constexpr (sizeof...(rest) > 0) print(rest...);`,
which the next lesson explains.)

## Fold expressions (C++17)

A **fold expression** applies a binary operator to all elements of a pack in one go. It must be written
in **parentheses**, and there are four forms. With `op` being any binary operator (`+`, `*`, `&&`, `||`,
`,`, `<<`, ...), and `E` a pattern using the pack:

| Form | Syntax | Expands to (for 3 elements) |
| --- | --- | --- |
| Unary right fold | `(E op ...)` | `E1 op (E2 op E3)` |
| Unary left fold | `(... op E)` | `(E1 op E2) op E3` |
| Binary right fold | `(E op ... op init)` | `E1 op (E2 op (E3 op init))` |
| Binary left fold | `(init op ... op E)` | `((init op E1) op E2) op E3` |

"Left" and "right" refer to which side the `...` is on and which way the parentheses group. For `+`
the grouping doesn't change the result, but for `-` it does:

```cpp run
#include <iostream>

template <typename... Ts>
int leftMinus(Ts... xs) { return (... - xs); }        // ((10 - 3) - 2)

template <typename... Ts>
int rightMinus(Ts... xs) { return (xs - ...); }       // (10 - (3 - 2))

template <typename... Ts>
int sumFromZero(Ts... xs) { return (0 + ... + xs); }  // binary left fold with init 0

template <typename... Ts>
int productRight(Ts... xs) { return (xs * ... * 1); } // binary right fold with init 1

int main() {
    std::cout << leftMinus(10, 3, 2) << '\n';
    std::cout << rightMinus(10, 3, 2) << '\n';
    std::cout << sumFromZero() << ' ' << sumFromZero(4, 5) << '\n';
    std::cout << productRight() << ' ' << productRight(2, 3, 4) << '\n';
}
```

```output
5
9
0 9
1 24
```

### Empty packs

A **binary** fold with an empty pack just gives `init`, which is why `sumFromZero()` returns `0`. A
**unary** fold over an empty pack is only allowed for three operators: `&&` gives `true`, `||` gives
`false`, and `,` gives `void()`. For anything else it's an error:

```cpp compile-error
template <typename... Ts>
auto sum(Ts... xs) { return (xs + ...); }

int main() {
    return sum();     // error: fold of empty expansion over operator+
}
```

So if a function must work with zero arguments, use a binary fold with a sensible starting value.

### Folding with `&&`, `||` and other patterns

`E` doesn't have to be just the pack name; it can be any expression containing it:

```cpp run
#include <iostream>

template <typename... Ts>
bool allPositive(Ts... xs) { return ((xs > 0) && ...); }

template <typename... Ts>
bool anyZero(Ts... xs) { return ((xs == 0) || ...); }

template <typename T, typename... Ts>
bool isOneOf(const T& value, const Ts&... options) {
    return ((value == options) || ...);
}

template <typename... Ts>
int sumOfSquares(Ts... xs) { return (0 + ... + (xs * xs)); }

int main() {
    std::cout << std::boolalpha;
    std::cout << allPositive(1, 2, 3) << ' ' << allPositive(1, -2, 3) << ' ' << allPositive() << '\n';
    std::cout << anyZero(4, 0, 2) << ' ' << anyZero() << '\n';
    std::cout << isOneOf('b', 'a', 'b', 'c') << ' ' << isOneOf(5, 1, 2) << '\n';
    std::cout << sumOfSquares(1, 2, 3) << '\n';
}
```

```output
true false true
true false
true false
14
```

`&&` and `||` folds short-circuit just like normal `&&`/`||`.

### Printing every argument

Two popular folds for output. The first folds over `<<` with `std::cout` as the init value (a binary
left fold). The second folds over the **comma operator**, which lets you run any statement-like
expression once per element, in order:

```cpp run
#include <iostream>
#include <string>

template <typename... Ts>
void printAll(const Ts&... args) {
    (std::cout << ... << args) << '\n';          // ((cout << a1) << a2) << a3
}

template <typename... Ts>
void printSpaced(const Ts&... args) {
    ((std::cout << args << ' '), ...);           // (cout << a1 << ' '), (cout << a2 << ' '), ...
    std::cout << '\n';
}

template <typename First, typename... Rest>
void printCommas(const First& first, const Rest&... rest) {
    std::cout << first;
    ((std::cout << ", " << rest), ...);          // separator before every element except the first
    std::cout << '\n';
}

int main() {
    printAll(1, '+', 2, " = ", 3);
    printSpaced("a", 2, 3.5, std::string("end"));
    printCommas(10, 20, 30);
    printCommas("only one");
}
```

```output
1+2 = 3
a 2 3.5 end
10, 20, 30
only one
```

The comma fold is the Swiss army knife: `(v.push_back(args), ...);` pushes every argument into a vector,
`(++count, ...)` counts, and so on.

## Variadic class templates

Class templates can be variadic too. You've used one: `std::tuple<int, double, std::string>` holds any
number of values of any types. A simple example:

```cpp run
#include <iostream>

template <typename... Ts>
struct TypeList {
    static constexpr std::size_t size = sizeof...(Ts);
};

int main() {
    std::cout << TypeList<>::size << ' ' << TypeList<int, char, double>::size << '\n';
}
```

```output
0 3
```

## Perfect forwarding (a first look)

Many standard functions take "whatever arguments you give and pass them on" to a constructor:
`std::make_unique<T>(args...)`, `vector::emplace_back(args...)`, `std::make_shared`. They're written
with a variadic template, **forwarding references** (`Args&&...`) and `std::forward`:

```cpp run
#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct Player {
    std::string name;
    int level;
    Player(std::string n, int l) : name(std::move(n)), level(l) {}
};

template <typename T, typename... Args>
std::unique_ptr<T> makeIt(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}

int main() {
    auto p = makeIt<Player>("Ada", 7);
    std::cout << p->name << ' ' << p->level << '\n';
}
```

```output
Ada 7
```

In a template, `Args&&` is not an "rvalue reference" but a **forwarding reference**: it binds to
anything. `std::forward<Args>(args)...` passes each argument on *exactly as it came in*: temporaries stay
temporaries (so they can be moved), named objects stay lvalues (so they're copied). The details of value
categories go beyond this lesson; for now, recognize the pattern `Args&&... args` +
`std::forward<Args>(args)...` when you see it.

## Common mistakes

- **Forgetting the parentheses** around a fold: `return xs + ...;` is a syntax error. Write `(xs + ...)`.
- **Unary fold on a possibly empty pack** with an operator other than `&&`, `||`, `,`.
- **Missing base case** in recursive expansion.
- **`...` in the wrong place**: `Ts... args` declares, `args...` expands, `typename... Ts` declares the
  type pack. `sizeof...(args)` has the dots *before* the parentheses.

:::quiz
What does `(... / xs)` compute for `xs = 64, 4, 2`?

- [x] `8`
- [ ] `32`
- [ ] `2`

`(... / xs)` is a unary **left** fold: `(64 / 4) / 2 = 8`. The right fold `(xs / ...)` would give
`64 / (4 / 2) = 32`.
:::

:::quiz
Which calls compile? (select all that apply)

```cpp
template <typename... Ts> int sumA(Ts... xs) { return (xs + ...); }
template <typename... Ts> int sumB(Ts... xs) { return (0 + ... + xs); }
template <typename... Ts> bool allB(Ts... xs) { return (xs && ...); }
```

- [ ] `sumA()`
- [x] `sumB()`
- [x] `allB()`
- [x] `sumA(1)`

An empty unary `+` fold has no value to produce, so `sumA()` fails. A binary fold returns its init
value (`0`), and an empty `&&` fold is `true`. A unary fold with a single element is just that element.
:::

:::exercise Sum them all
Write a variadic function template `sum` that adds any number of arguments using a **fold expression**,
and returns `0` when called with no arguments.

**Input:** three integers `a b c`, then two decimals `x y`.
**Output:** four lines: `sum(a, b, c)`, `sum(x, y)`, `sum(a, x)` and `sum()`.

```cpp starter
#include <iostream>

double sum(double a, double b) {
    return a + b;
}

int main() {
    int a, b, c;
    double x, y;
    std::cin >> a >> b >> c >> x >> y;
    std::cout << sum(x, y) << '\n';
    // make sum variadic and print all four results
}
```

```cpp solution
#include <iostream>

template <typename... Ts>
auto sum(Ts... values) {
    return (0 + ... + values);
}

int main() {
    int a, b, c;
    double x, y;
    std::cin >> a >> b >> c >> x >> y;
    std::cout << sum(a, b, c) << '\n';
    std::cout << sum(x, y) << '\n';
    std::cout << sum(a, x) << '\n';
    std::cout << sum() << '\n';
}
```

```hint
`template <typename... Ts> auto sum(Ts... values)`.
```

```hint
To allow `sum()` with no arguments, use a **binary** fold with `0` as the initial value:
`(0 + ... + values)`.
```

```stdin
1 2 3
0.5 0.25
```

```expected
6
0.75
1.5
0
```

```stdin
-5 5 0
-1.5 1.5
```

```expected hidden
0
0
-6.5
0
```

```checks
must typename\s*\.\.\. :: Declare a template parameter pack with typename...
must \.\.\.\s*\+|\+\s*\.\.\. :: Use a fold expression over +.
```
:::

:::exercise Print with separators
Write a variadic function template `print` that prints its arguments separated by `, ` and followed by a
newline. It must work with arguments of different types. (You may assume at least one argument.)

**Input:** an integer, a word and a decimal number.
**Output:** three lines: `print(i)`, `print(i, w)` and `print(i, w, d)`.

```cpp starter
#include <iostream>
#include <string>

void print(int i) {
    std::cout << i << '\n';
}

int main() {
    int i;
    std::string w;
    double d;
    std::cin >> i >> w >> d;
    print(i);
}
```

```cpp solution
#include <iostream>
#include <string>

template <typename First, typename... Rest>
void print(const First& first, const Rest&... rest) {
    std::cout << first;
    ((std::cout << ", " << rest), ...);
    std::cout << '\n';
}

int main() {
    int i;
    std::string w;
    double d;
    std::cin >> i >> w >> d;
    print(i);
    print(i, w);
    print(i, w, d);
}
```

```hint
Split off the first argument: `template <typename First, typename... Rest> void print(const First& first, const Rest&... rest)`.
Print `first`, then print `", "` before each of the rest.
```

```hint
A comma fold runs an expression once per element: `((std::cout << ", " << rest), ...);`.
Recursion with a base case works too.
```

```stdin
7 apple 2.5
```

```expected
7
7, apple
7, apple, 2.5
```

```stdin
-1 x 0
```

```expected hidden
-1
-1, x
-1, x, 0
```

```checks
must typename\s*\.\.\. :: Make print a variadic template.
```
:::

:::exercise Recursive minimum
Write a variadic function template `minOf(first, rest...)` that returns the smallest of its arguments
using **recursion** (not a fold): the minimum of one value is that value, and the minimum of several is
the smaller of the first and the minimum of the rest. All arguments have the same type.

**Input:** five integers `a b c d e`.
**Output:** three lines: `minOf(a)`, `minOf(a, b, c)` and `minOf(a, b, c, d, e)`.

```cpp starter
#include <iostream>

int minOf(int a, int b) {
    return a < b ? a : b;
}

int main() {
    int a, b, c, d, e;
    std::cin >> a >> b >> c >> d >> e;
    std::cout << a << '\n';
    std::cout << minOf(minOf(a, b), c) << '\n';
}
```

```cpp solution
#include <iostream>

template <typename T>
T minOf(T only) {
    return only;
}

template <typename T, typename... Rest>
T minOf(T first, Rest... rest) {
    T restMin = minOf(rest...);
    return first < restMin ? first : restMin;
}

int main() {
    int a, b, c, d, e;
    std::cin >> a >> b >> c >> d >> e;
    std::cout << minOf(a) << '\n';
    std::cout << minOf(a, b, c) << '\n';
    std::cout << minOf(a, b, c, d, e) << '\n';
}
```

```hint
You need two templates: a base case `template <typename T> T minOf(T only)` and the recursive case
`template <typename T, typename... Rest> T minOf(T first, Rest... rest)`.
```

```hint
In the recursive case: compute `minOf(rest...)`, then return whichever of `first` and that is smaller.
```

```stdin
5 3 8 1 9
```

```expected
5
3
1
```

```stdin
-2 -2 -2 -2 -2
```

```expected hidden
-2
-2
-2
```

```checks
must typename\s*\.\.\. :: Make minOf a variadic template.
must minOf\s*\(\s*rest\s*\.\.\.\s*\) :: Recurse with minOf(rest...).
```
:::

:::exercise All and any
Write two variadic templates using `&&` and `||` folds:

- `allPositive(xs...)`: true if every argument is greater than 0 (true for no arguments),
- `anyEven(xs...)`: true if at least one argument is even (false for no arguments),

and a third, `count(xs...)`, that returns how many arguments it got using `sizeof...`.

**Input:** four integers `a b c d`.
**Output:** exactly these four lines (with `yes` or `no`, and the count):

```
all positive: <allPositive(a, b, c, d)>
any even: <anyEven(a, b, c, d)>
empty all/any: <allPositive()> <anyEven()>
count: <count(a, b, c, d)>
```

```cpp starter
#include <iostream>

int main() {
    int a, b, c, d;
    std::cin >> a >> b >> c >> d;
    bool all = a > 0 && b > 0 && c > 0 && d > 0;
    std::cout << "all positive: " << (all ? "yes" : "no") << '\n';
}
```

```cpp solution
#include <iostream>

template <typename... Ts>
bool allPositive(Ts... xs) { return ((xs > 0) && ...); }

template <typename... Ts>
bool anyEven(Ts... xs) { return ((xs % 2 == 0) || ...); }

template <typename... Ts>
std::size_t count(Ts...) { return sizeof...(Ts); }

const char* yesNo(bool b) { return b ? "yes" : "no"; }

int main() {
    int a, b, c, d;
    std::cin >> a >> b >> c >> d;
    std::cout << "all positive: " << yesNo(allPositive(a, b, c, d)) << '\n';
    std::cout << "any even: " << yesNo(anyEven(a, b, c, d)) << '\n';
    std::cout << "empty all/any: " << yesNo(allPositive()) << ' ' << yesNo(anyEven()) << '\n';
    std::cout << "count: " << count(a, b, c, d) << '\n';
}
```

```hint
`((xs > 0) && ...)` is true for an empty pack, and `((xs % 2 == 0) || ...)` is false for an empty pack.
That's exactly what the problem asks.
```

```hint
`sizeof...(Ts)` (or `sizeof...(xs)`) gives the number of arguments as a compile-time constant.
```

```stdin
1 3 5 7
```

```expected
all positive: yes
any even: no
empty all/any: yes no
count: 4
```

```stdin
2 -1 0 9
```

```expected hidden
all positive: no
any even: yes
empty all/any: yes no
count: 4
```

```checks
must &&\s*\.\.\. :: Use an && fold expression.
must \|\|\s*\.\.\. :: Use an || fold expression.
must sizeof\s*\.\.\. :: Use sizeof... to count the arguments.
```
:::
