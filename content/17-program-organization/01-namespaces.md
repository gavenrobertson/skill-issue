---
title: Namespaces
summary: Group names to avoid collisions. Defining and nesting namespaces, the global namespace, anonymous and inline namespaces, aliases, using-declarations vs using-directives, and argument-dependent lookup.
---

## The problem: name collisions

Big programs combine code from many places: your files, teammates' files, third-party libraries, and
the standard library. Sooner or later two of them want the same name. A graphics library has a
`draw()`, a cards library has a `draw()`, and the linker has no idea which one you mean.

A **namespace** is a named scope that groups related names. Two `draw` functions in different
namespaces are different functions: `graphics::draw` and `cards::draw`. You've been using one since
your first program: the standard library lives in namespace `std`.

## Defining and using a namespace

```cpp run
#include <iostream>

namespace graphics {
    int drawCount = 0;

    void draw() {
        ++drawCount;                       // inside the namespace, no prefix needed
        std::cout << "graphics::draw (call " << drawCount << ")\n";
    }
}

namespace cards {
    void draw() {
        std::cout << "cards::draw: you drew the ace of spades\n";
    }
}

int main() {
    graphics::draw();                      // qualified name: namespace::member
    cards::draw();
    graphics::draw();
    std::cout << "count = " << graphics::drawCount << '\n';
}
```

```output
graphics::draw (call 1)
cards::draw: you drew the ace of spades
graphics::draw (call 2)
count = 2
```

- `::` is the **scope resolution operator**.
- A namespace can contain anything that can be declared at file scope: variables, functions, classes,
  enums, templates, type aliases, and other namespaces.
- No semicolon after the closing brace (unlike a class).
- Namespaces can only be defined at file scope or inside another namespace, never inside a function.

### Namespaces are open

You can add to a namespace from several places, even several files. Each `namespace name { ... }`
block **reopens** the same namespace. That's how the standard library spreads `std` across dozens of
headers.

```cpp run
#include <iostream>

namespace util {
    int square(int x) { return x * x; }
}

namespace util {                       // reopened: same namespace
    int cube(int x) { return x * square(x); }
}

int main() {
    std::cout << util::square(4) << ' ' << util::cube(3) << '\n';
}
```

```output
16 27
```

### Declaring inside, defining outside

Just like class member functions, you can declare in the namespace and define later using the
qualified name:

```cpp run
#include <iostream>

namespace math {
    double average(double a, double b);   // declaration
}

double math::average(double a, double b) {  // definition, outside the braces
    return (a + b) / 2;
}

int main() {
    std::cout << math::average(3, 4) << '\n';
}
```

```output
3.5
```

## Nested namespaces

Namespaces nest. Before C++17 you had to write each level; C++17 added the compact `a::b::c` form:

```cpp run
#include <iostream>

namespace company {
    namespace product {                    // classic nesting
        int version() { return 1; }
    }
}

namespace company::product::detail {       // C++17 nested namespace definition
    int buildNumber() { return 4711; }
}

int main() {
    std::cout << company::product::version() << '.'
              << company::product::detail::buildNumber() << '\n';
}
```

```output
1.4711
```

A namespace called `detail` (or `impl`, `internal`) is a common convention for "implementation stuff,
not meant for users".

## The global namespace and `::name`

Anything declared outside every namespace lives in the **global namespace**. A leading `::` with
nothing before it means "look this up in the global namespace". You need it when a local or namespace
name **hides** a global one:

```cpp run
#include <iostream>

int value = 100;                           // global

namespace config {
    int value = 200;

    void show() {
        int value = 300;                   // local hides both
        std::cout << "local:  " << value << '\n';
        std::cout << "config: " << config::value << '\n';
        std::cout << "global: " << ::value << '\n';
    }
}

int main() {
    config::show();
}
```

```output
local:  300
config: 200
global: 100
```

## Anonymous (unnamed) namespaces

A namespace without a name is **anonymous**. Its members are usable as if they were declared in the
enclosing scope, but they get **internal linkage**: they're private to the current source file
(`.cpp`). Another file can define its own helper with the same name without a clash.

```cpp run
#include <iostream>

namespace {                                // only visible in this file
    int callCount = 0;

    void helper() {
        ++callCount;
    }
}

int main() {
    helper();                              // no prefix needed
    helper();
    std::cout << "helper called " << callCount << " times\n";
}
```

```output
helper called 2 times
```

Use an anonymous namespace for helper functions and file-private globals in `.cpp` files. It's the
modern replacement for marking them `static` (more on linkage in a later lesson). **Never** put one in a
header: every file that includes the header would get its own separate copy.

## Inline namespaces: versioning

Members of an `inline namespace` are also visible as if they were members of the **enclosing**
namespace. Library authors use this for versioning: the current version is `inline`, so users get it by
default, but older versions remain reachable by their full name.

```cpp run
#include <iostream>

namespace parser {
    namespace v1 {
        int parse() { return 1; }
    }
    inline namespace v2 {                  // the default version
        int parse() { return 2; }
    }
}

int main() {
    std::cout << parser::parse() << '\n';      // finds v2::parse via the inline namespace
    std::cout << parser::v1::parse() << '\n';  // old version, explicitly
    std::cout << parser::v2::parse() << '\n';  // new version, explicitly
}
```

```output
2
1
2
```

When `v3` ships, the library moves `inline` from `v2` to `v3`, and users' code picks up the new
version on recompile. The standard library uses inline namespaces for literals: `std::literals::chrono_literals`
is inline inside `std::literals`, which is inline inside `std`.

## Namespace aliases

Long names get tedious. A **namespace alias** gives a namespace a short second name:

```cpp run
#include <iostream>

namespace company::product::detail {
    int buildNumber() { return 4711; }
}

int main() {
    namespace cpd = company::product::detail;   // alias (can be local to a function)
    std::cout << cpd::buildNumber() << '\n';
}
```

```output
4711
```

You'll see `namespace fs = std::filesystem;` and `namespace chr = std::chrono;` all the time.

## Using-declarations vs using-directives

Two ways to avoid typing the prefix:

| Form | Example | Effect |
| --- | --- | --- |
| **using-declaration** | `using std::cout;` | brings **one** name into the current scope |
| **using-directive** | `using namespace std;` | makes **every** name in the namespace visible here |

```cpp run
#include <iostream>
#include <string>

namespace shapes {
    double pi = 3.14159;
    double circleArea(double r) { return pi * r * r; }
    double squareArea(double s) { return s * s; }
}

void declarationStyle() {
    using shapes::circleArea;              // just this one name
    std::cout << circleArea(1) << '\n';
    // squareArea(2);                      // error: not imported
}

void directiveStyle() {
    using namespace shapes;                // everything, but only inside this function
    std::cout << squareArea(2) << ' ' << pi << '\n';
}

int main() {
    declarationStyle();
    directiveStyle();
}
```

```output
3.14159
4 3.14159
```

Both obey **scope**: put them inside a function and they only affect that function.

Why are using-directives risky? They can create **ambiguities** that didn't exist before, especially
as libraries grow:

```cpp compile-error
#include <iostream>

namespace audio { int volume() { return 5; } }
namespace video { int volume() { return 9; } }

using namespace audio;
using namespace video;

int main() {
    std::cout << volume();   // error: call of overloaded 'volume()' is ambiguous
}
```

Rules of thumb:

- **Never** write `using namespace ...;` at file scope in a **header**. Every file that includes the
  header gets all those names dumped into it, with no way to undo it.
- In `.cpp` files and small programs, prefer using-declarations (`using std::cout;`) or a namespace
  alias. `using namespace std;` is tolerable in tiny programs, but explicit `std::` is clearer.
- `using namespace std::chrono_literals;` (or similar literal namespaces) is the standard, accepted
  exception: those namespaces exist to be pulled in.

## Argument-dependent lookup (ADL)

Why does this work without writing `std::`?

```cpp
std::string s = "hi";
std::cout << s;            // calls std::operator<<(std::ostream&, const std::string&)
```

Because of **argument-dependent lookup** (also called Koenig lookup): when you call an **unqualified**
function, the compiler also searches the namespaces of the **argument types**. `s` is a `std::string`,
so `std` is searched, and `std::operator<<` is found. The same applies to your own types:

```cpp run
#include <iostream>

namespace geo {
    struct Point {
        int x;
        int y;
    };

    void print(const Point& p) {
        std::cout << "geo::Point(" << p.x << ", " << p.y << ")\n";
    }
}

int main() {
    geo::Point p{1, 2};
    print(p);              // no geo:: needed: ADL looks in geo because p is a geo::Point
}
```

```output
geo::Point(1, 2)
```

ADL is what makes operators defined next to a type "just work". It's also why the standard swap idiom
looks like this, letting a type's own `swap` win over the generic `std::swap` when one exists:

```cpp
using std::swap;   // fallback
swap(a, b);        // unqualified: ADL finds a better swap in a's namespace if there is one
```

:::quiz
Which line brings **only** `std::string` into scope?

- [ ] `using namespace std::string;`
- [x] `using std::string;`
- [ ] `namespace string = std::string;`
- [ ] `#include std::string`

`using std::string;` is a using-declaration for one name. `using namespace` requires a namespace,
and a namespace alias (`namespace x = ...`) can only name a namespace, not a class.
:::

:::quiz
What does an anonymous namespace give its members?

- [ ] External linkage: visible from every file
- [x] Internal linkage: visible only in the current source file
- [ ] Nothing; it's a syntax error
- [ ] They become members of `std`

Names in an unnamed namespace are unique to their translation unit, so helpers in two different `.cpp`
files can't collide.
:::

:::quiz
```cpp
namespace lib {
    namespace v1 { int f() { return 1; } }
    inline namespace v2 { int f() { return 2; } }
}
```

What is `lib::f() + lib::v1::f()`?

- [ ] `2`
- [x] `3`
- [ ] `4`
- [ ] Compile error: `f` is ambiguous

`lib::f` finds `v2::f` (2) through the inline namespace; `lib::v1::f` explicitly names version 1 (1).
:::

:::exercise Geometry namespace
Create a namespace `geo` with two functions:

- `double rectArea(double w, double h)`
- `double rectPerimeter(double w, double h)`

and a nested namespace `geo::circle` (use the C++17 `namespace geo::circle { }` syntax) with
`double area(double r)` using `3.14159` for π.

Read `w h r` and print, each with exactly two decimals:

```
rect area: <w*h>
rect perimeter: <2*(w+h)>
circle area: <3.14159*r*r>
```

Call the functions with qualified names from `main`, and don't use `using namespace`.

```cpp starter
#include <iomanip>
#include <iostream>

// define namespace geo and geo::circle here

int main() {
    double w, h, r;
    std::cin >> w >> h >> r;
    std::cout << std::fixed << std::setprecision(2);
}
```

```cpp solution
#include <iomanip>
#include <iostream>

namespace geo {
    double rectArea(double w, double h) { return w * h; }
    double rectPerimeter(double w, double h) { return 2 * (w + h); }
}

namespace geo::circle {
    double area(double r) { return 3.14159 * r * r; }
}

int main() {
    double w, h, r;
    std::cin >> w >> h >> r;
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "rect area: " << geo::rectArea(w, h) << '\n';
    std::cout << "rect perimeter: " << geo::rectPerimeter(w, h) << '\n';
    std::cout << "circle area: " << geo::circle::area(r) << '\n';
}
```

```hint
`namespace geo::circle { double area(double r) { ... } }` creates the nested namespace in one line.
Call it as `geo::circle::area(r)`.
```

```stdin
3 4 1
```

```expected
rect area: 12.00
rect perimeter: 14.00
circle area: 3.14
```

```stdin
0 2.5 10
```

```expected hidden
rect area: 0.00
rect perimeter: 5.00
circle area: 314.16
```

```checks
must namespace\s+geo\s*\{ :: Define a namespace named geo.
must namespace\s+geo::circle :: Use the C++17 nested form namespace geo::circle.
must geo::circle::area :: Call geo::circle::area with its qualified name.
mustnot using\s+namespace :: Don't use a using-directive here.
```
:::

:::exercise Versioned API
A library formats prices. Version 1 printed whole dollars; version 2 prints cents too. Write:

```cpp
namespace pricing {
    namespace v1        { std::string format(int cents); }   // "$12"   (cents / 100, truncated)
    inline namespace v2 { std::string format(int cents); }   // "$12.05" (always two digits of cents)
}
```

Read a non-negative number of cents and print three lines: `v1: <pricing::v1::format>`,
`v2: <pricing::v2::format>`, and `default: <pricing::format>` (which must resolve to v2 through the
inline namespace).

```cpp starter
#include <iostream>
#include <string>

namespace pricing {
    std::string format(int cents) {
        return "$" + std::to_string(cents / 100);
    }
}

int main() {
    int cents;
    std::cin >> cents;
    std::cout << "default: " << pricing::format(cents) << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

namespace pricing {
    namespace v1 {
        std::string format(int cents) {
            return "$" + std::to_string(cents / 100);
        }
    }
    inline namespace v2 {
        std::string format(int cents) {
            int rest = cents % 100;
            return "$" + std::to_string(cents / 100) + "." + (rest < 10 ? "0" : "") + std::to_string(rest);
        }
    }
}

int main() {
    int cents;
    std::cin >> cents;
    std::cout << "v1: " << pricing::v1::format(cents) << '\n';
    std::cout << "v2: " << pricing::v2::format(cents) << '\n';
    std::cout << "default: " << pricing::format(cents) << '\n';
}
```

```hint
Put `inline` in front of `namespace v2` so that `pricing::format` finds the v2 version.
```

```stdin
1205
```

```expected
v1: $12
v2: $12.05
default: $12.05
```

```stdin
7
```

```expected hidden
v1: $0
v2: $0.07
default: $0.07
```

```stdin
99990
```

```expected
v1: $999
v2: $999.90
default: $999.90
```

```checks
must inline\s+namespace\s+v2 :: Make v2 an inline namespace.
must namespace\s+v1 :: Keep version 1 in namespace v1.
must pricing::format\s*\( :: Call the default pricing::format.
```
:::

:::exercise Who's who
The starter declares a global `int limit` and a function whose parameter is **also** named `limit`.
Complete `report` so that, for the parameter value `limit`, it prints:

```
local limit: <parameter value>
global limit: <global value>
within global: yes|no
```

where the last line says `yes` if the parameter is less than or equal to the global limit. Then make `main`
read two numbers: first set the **global** `limit` to the first number, then call `report` with the second.

Access the global with `::limit`.

```cpp starter
#include <iostream>

int limit = 10;

void report(int limit) {
    std::cout << "local limit: " << limit << '\n';
}

int main() {
    int g, x;
    std::cin >> g >> x;
    report(x);
}
```

```cpp solution
#include <iostream>

int limit = 10;

void report(int limit) {
    std::cout << "local limit: " << limit << '\n';
    std::cout << "global limit: " << ::limit << '\n';
    std::cout << "within global: " << (limit <= ::limit ? "yes" : "no") << '\n';
}

int main() {
    int g, x;
    std::cin >> g >> x;
    ::limit = g;
    report(x);
}
```

```hint
Inside `report`, plain `limit` is the parameter. `::limit` is the one in the global namespace.
```

```stdin
50 20
```

```expected
local limit: 20
global limit: 50
within global: yes
```

```stdin
5 6
```

```expected hidden
local limit: 6
global limit: 5
within global: no
```

```stdin
-3 -3
```

```expected
local limit: -3
global limit: -3
within global: yes
```

```checks
must ::limit :: Use ::limit to reach the global variable.
```
:::
