---
title: Type Aliases
summary: Give existing types new names with typedef and using, tame long container and function-pointer types, and a first look at alias templates.
---

## Why give a type another name?

Some types are long, and some are meaningful in ways the raw type doesn't express:

```cpp
std::vector<std::vector<int>> board;                    // what is this?
std::map<std::string, std::vector<int>> scoresByName;   // a lot to type, every time
double temperature;                                     // Celsius? Fahrenheit?
```

A **type alias** is a new name for an existing type. It doesn't create a new type; it's just a nickname
the compiler replaces with the real type:

```cpp
using Board = std::vector<std::vector<int>>;
using Celsius = double;

Board board;           // exactly the same as std::vector<std::vector<int>> board;
Celsius temperature;   // exactly a double
```

Aliases help in three ways:

1. **Readability:** `Board` says what the data *means*.
2. **Less typing** for long types.
3. **One place to change:** if `Celsius` later needs to be `float`, change one line.

## `using`: the modern syntax (C++11)

```cpp
using NewName = ExistingType;
```

```cpp run
#include <iostream>
#include <string>
#include <vector>

using Score = int;
using Scores = std::vector<Score>;
using Name = std::string;

int main() {
    Name player = "Ada";
    Scores history{90, 85, 97};

    Score best = 0;
    for (Score s : history) {
        if (s > best) best = s;
    }
    std::cout << player << "'s best: " << best << '\n';
}
```

```output
Ada's best: 97
```

## `typedef`: the older syntax

`typedef` comes from C and does the same thing. It's written like a variable declaration with `typedef`
in front, where the "variable name" becomes the alias:

```cpp
typedef unsigned long long BigNum;         // BigNum means unsigned long long
typedef std::vector<std::string> Words;    // Words means std::vector<std::string>
typedef int Triple[3];                     // Triple means int[3]
```

```cpp run
#include <iostream>

typedef unsigned long long BigNum;
typedef int Triple[3];

int main() {
    BigNum big = 18'000'000'000'000'000'000ULL;
    Triple t{1, 2, 3};                 // an array of 3 ints
    std::cout << big << ' ' << t[2] << ' ' << sizeof(Triple) << '\n';
}
```

```output
18000000000000000000 3 12
```

`using` and `typedef` produce identical aliases. Prefer `using` in new code: the name is on the left
where you'd expect it, it reads more clearly for complicated types, and only `using` can make alias
templates (below). You'll still see `typedef` everywhere in C and older C++ code.

| `typedef` | `using` |
| --- | --- |
| `typedef double Meters;` | `using Meters = double;` |
| `typedef int Triple[3];` | `using Triple = int[3];` |
| `typedef void (*Callback)(int);` | `using Callback = void (*)(int);` |

## An alias is not a new type

This is the most important thing to understand. Two aliases for `double` are the **same type**, so the
compiler happily mixes them:

```cpp run
#include <iostream>

using Meters = double;
using Seconds = double;

int main() {
    Meters distance = 100.0;
    Seconds time = 9.58;

    Meters oops = distance + time;    // compiles! Adding meters to seconds is nonsense
    std::cout << oops << '\n';
}
```

```output
109.58
```

Aliases document meaning but don't enforce it. If you need the compiler to *reject* mixing units, wrap
the value in a struct (`struct Meters { double value; };`) so it becomes a genuinely different type.
That's called a **strong typedef**.

## Aliases for complicated types

Aliases shine for nested container types and for anything you'd otherwise repeat:

```cpp run
#include <iostream>
#include <map>
#include <string>
#include <vector>

using Row = std::vector<int>;
using Grid = std::vector<Row>;
using Gradebook = std::map<std::string, std::vector<int>>;

int sumGrid(const Grid& g) {          // much clearer than const std::vector<std::vector<int>>&
    int total = 0;
    for (const Row& row : g) {
        for (int x : row) total += x;
    }
    return total;
}

int main() {
    Grid g{{1, 2, 3}, {4, 5, 6}};
    std::cout << sumGrid(g) << '\n';

    Gradebook book;
    book["Ada"] = {90, 95};
    book["Linus"].push_back(80);
    std::cout << book["Ada"].size() << ' ' << book["Linus"][0] << '\n';
}
```

```output
21
2 80
```

### Aliases for function pointers

Function pointer types are the classic case where an alias turns unreadable code into readable code.
Compare these two declarations of a function that takes a callback:

```cpp
void forEach(const int* arr, int n, void (*fn)(int));   // raw syntax

using Visitor = void (*)(int);                          // alias
void forEach(const int* arr, int n, Visitor fn);        // much easier to read
```

And a function that **returns** a function pointer, without and with an alias:

```cpp
int (*pickOperation(char op))(int, int);   // a function returning int(*)(int, int). Yikes.

using Operation = int (*)(int, int);
Operation pickOperation(char op);          // the same declaration, readable
```

You can also alias a **function type** (no `*`) and add the `*` where you use it:

```cpp run
#include <iostream>

using Visitor = void (*)(int);    // pointer-to-function type
using Handler = void(int);        // function type

void printTwice(int x) { std::cout << x << ' ' << x << '\n'; }

void forEach(const int* arr, int n, Visitor fn) {
    for (int i = 0; i < n; ++i) fn(arr[i]);
}

int main() {
    int values[3]{1, 2, 3};
    forEach(values, 3, printTwice);

    Handler* h = printTwice;      // Handler* is the same type as Visitor
    h(9);
}
```

```output
1 1
2 2
3 3
9 9
```

## Aliases you already use

The standard library is full of aliases. A few you've met:

- `std::size_t` is an alias for some unsigned integer type (usually `unsigned long`).
- `std::string` is an alias for `std::basic_string<char>`.
- `std::int32_t`, `std::uint8_t`, etc. (from `<cstdint>`) are aliases for whichever built-in type has
  exactly that many bits on your platform.
- Every container defines member aliases: `std::vector<int>::size_type`, `std::vector<int>::value_type`
  (which is `int`), and so on.

```cpp run
#include <cstdint>
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

int main() {
    std::cout << std::is_same_v<std::string, std::basic_string<char>> << '\n';
    std::cout << std::is_same_v<std::vector<int>::value_type, int> << '\n';
    std::cout << sizeof(std::int64_t) << ' ' << sizeof(std::uint8_t) << '\n';
}
```

```output
1
1
8 1
```

(`std::is_same_v<A, B>` from `<type_traits>` is `true` when `A` and `B` are exactly the same type, a
handy way to prove that an alias really is just another name.)

## Where aliases can live

Like variables, aliases have **scope**. Declare them globally, inside a namespace, inside a function, or
inside a struct:

```cpp
namespace geometry {
    using Coordinate = double;     // geometry::Coordinate
}

struct Inventory {
    using ItemId = int;            // Inventory::ItemId
    std::vector<ItemId> items;
};

void f() {
    using Matrix3 = double[3][3];  // only visible inside f
}
```

## Alias templates (a brief look)

A `using` alias can also take **template parameters**, giving a family of aliases. That's something
`typedef` can't do:

```cpp run
#include <iostream>
#include <string>
#include <vector>

template <typename T>
using Matrix = std::vector<std::vector<T>>;   // Matrix<T> is a vector of vectors of T

int main() {
    Matrix<int> counts{{1, 2}, {3, 4}};
    Matrix<std::string> labels{{"a", "b"}, {"c", "d"}};

    std::cout << counts[1][0] << ' ' << labels[0][1] << '\n';
}
```

```output
3 b
```

You'll learn templates properly in a later module. For now, recognize the shape: `template <typename T>`
followed by a `using` alias that mentions `T`.

:::quiz
After `using Meters = double; using Feet = double;`, what happens with `Meters m = 3.0; Feet f = m;`?

- [ ] Compile error: different types
- [x] It compiles: both are just `double`
- [ ] It converts meters to feet automatically
- [ ] Runtime error

An alias is not a new type. `Meters` and `Feet` are both exactly `double`, so assigning one to the other
is plain `double` assignment.
:::

:::quiz
Which declarations make `Callback` mean "pointer to a function taking `int` and returning `void`"? (select all that apply)

- [x] `using Callback = void (*)(int);`
- [x] `typedef void (*Callback)(int);`
- [ ] `using Callback = void *(int);`
- [ ] `typedef void Callback(int)*;`

Both correct forms put the `*` in parentheses. `void *(int)` is a function type returning `void*`.
:::

:::exercise Row sums {easy}
Define the aliases `using Row = std::vector<int>;` and `using Grid = std::vector<Row>;`. Read a grid
and print the sum of each row. Write a function `Row rowSums(const Grid& g)` that returns all the sums.

**Input:** `rows cols`, then `rows` lines with `cols` integers each.
**Output:** one line per row with that row's sum.

```cpp starter
#include <iostream>
#include <vector>

int main() {
    int rows, cols;
    std::cin >> rows >> cols;
    std::vector<std::vector<int>> g(rows, std::vector<int>(cols));
    for (auto& row : g) {
        for (int& x : row) std::cin >> x;
    }
}
```

```cpp solution
#include <iostream>
#include <vector>

using Row = std::vector<int>;
using Grid = std::vector<Row>;

Row rowSums(const Grid& g) {
    Row sums;
    for (const Row& row : g) {
        int total = 0;
        for (int x : row) total += x;
        sums.push_back(total);
    }
    return sums;
}

int main() {
    int rows, cols;
    std::cin >> rows >> cols;
    Grid g(rows, Row(cols));
    for (Row& row : g) {
        for (int& x : row) std::cin >> x;
    }
    for (int s : rowSums(g)) {
        std::cout << s << '\n';
    }
}
```

```hint
With the aliases, the grid is `Grid g(rows, Row(cols));`.
```

```stdin
2 3
1 2 3
4 5 6
```

```expected
6
15
```

```stdin
3 1
-5
0
5
```

```expected
-5
0
5
```

```stdin
1 4
10 -10 7 8
```

```expected hidden
15
```

```stdin
2 2
-1 -2
-3 -4
```

```expected hidden
-3
-7
```

```checks
must using\s+Row\s*=\s*std::vector\s*<\s*int\s*> :: Define using Row = std::vector<int>;
must using\s+Grid\s*=\s*std::vector\s*<\s*Row\s*> :: Define using Grid = std::vector<Row>;
must Row\s+rowSums\s*\(\s*const\s+Grid\s*& :: Write Row rowSums(const Grid& g).
```
:::

:::exercise Big factorial {easy}
Use the classic `typedef` syntax to define `BigNum` as `unsigned long long`, and write
`BigNum factorial(int n)`. Read `n` and print `n!`.

**Input:** one integer `n` from 0 to 20.
**Output:** `n!`, followed by a newline. (Remember `0! = 1`.)

```cpp starter
#include <iostream>

int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}

int main() {
    int n;
    std::cin >> n;
    std::cout << factorial(n) << '\n';
}
```

```cpp solution
#include <iostream>

typedef unsigned long long BigNum;

BigNum factorial(int n) {
    BigNum result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}

int main() {
    int n;
    std::cin >> n;
    std::cout << factorial(n) << '\n';
}
```

```hint
`typedef unsigned long long BigNum;`: the alias name goes where a variable name would. Use `BigNum` for
the result variable and the return type, or the starter's `int` overflows past `12!`.
```

```stdin
5
```

```expected
120
```

```stdin
0
```

```expected
1
```

```stdin
20
```

```expected hidden
2432902008176640000
```

```stdin
13
```

```expected hidden
6227020800
```

```stdin
1
```

```expected hidden
1
```

```checks
must typedef\s+unsigned\s+long\s+long\s+BigNum :: Define the alias with typedef unsigned long long BigNum;
must BigNum\s+factorial :: Return a BigNum from factorial.
```
:::

:::exercise Transform pipeline {medium}
Define `using Transform = int (*)(int);` and four functions `int(int)`: `twice` (×2), `inc` (+1),
`square` (x²), and `negate` (−x). Write `Transform lookup(const std::string& name)` that returns the
function for a name, or `nullptr` for an unknown name.

Read a starting value, then apply the named transforms **in order** until the input ends. Skip unknown
names. Print the final value.

**Input:** an integer, then zero or more words from `twice`, `inc`, `square`, `negate` (others are skipped).
**Output:** the final value, followed by a newline.

Example: `3 inc square negate` computes `-(3 + 1)²` = `-16`.

```cpp starter
#include <iostream>
#include <string>

int main() {
    int value;
    std::cin >> value;
    std::string name;
    while (std::cin >> name) {
        // apply the transform named 'name'
    }
    std::cout << value << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

using Transform = int (*)(int);

int twice(int x) { return x * 2; }
int inc(int x) { return x + 1; }
int square(int x) { return x * x; }
int negate(int x) { return -x; }

Transform lookup(const std::string& name) {
    if (name == "twice") return twice;
    if (name == "inc") return inc;
    if (name == "square") return square;
    if (name == "negate") return negate;
    return nullptr;
}

int main() {
    int value;
    std::cin >> value;
    std::string name;
    while (std::cin >> name) {
        if (Transform t = lookup(name)) {
            value = t(value);
        }
    }
    std::cout << value << '\n';
}
```

```hint
`Transform lookup(const std::string& name)` can `return twice;`: a function's name converts to a pointer to it.
```

```hint
`if (Transform t = lookup(name)) value = t(value);` skips unknown names, since `nullptr` is false.
```

```stdin
3 inc square negate
```

```expected
-16
```

```stdin
7
```

```expected
7
```

```stdin
2 twice twice cube inc
```

```expected hidden
9
```

```stdin
-3 square negate twice
```

```expected hidden
-18
```

```stdin
0 Inc inc inc square negate negate
```

```expected hidden
4
```

```checks
must using\s+Transform\s*=\s*int\s*\(\s*\*\s*\)\s*\(\s*int\s*\) :: Define using Transform = int (*)(int);
must Transform\s+lookup\s*\( :: Write Transform lookup(const std::string& name).
```
:::
