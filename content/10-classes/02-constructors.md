---
title: Constructors
summary: Default and parameterized constructors, member initializer lists, default member initializers, delegating and explicit constructors, = default, = delete, and brace initialization of objects.
---

## The problem constructors solve

A class with private data needs a way to **start** in a valid state. Calling a `set()` function after
creating the object is easy to forget, and in between the object is half-made. A **constructor** is a
special member function that runs **automatically when an object is created**, so an object can never
exist without being set up.

A constructor:

- has **the same name as the class**,
- has **no return type** (not even `void`),
- can take parameters and can be **overloaded** like any function.

```cpp run
#include <iostream>

class Point {
private:
    int x_;
    int y_;

public:
    Point() {                     // default constructor: no parameters
        x_ = 0;
        y_ = 0;
        std::cout << "Point()\n";
    }

    Point(int x, int y) {         // parameterized constructor
        x_ = x;
        y_ = y;
        std::cout << "Point(" << x << ", " << y << ")\n";
    }

    void print() const { std::cout << '(' << x_ << ", " << y_ << ")\n"; }
};

int main() {
    Point a;          // calls Point()
    Point b(3, 4);    // calls Point(int, int)
    Point c{5, 6};    // same, with braces
    a.print();
    b.print();
    c.print();
}
```

```output
Point()
Point(3, 4)
Point(5, 6)
(0, 0)
(3, 4)
(5, 6)
```

## The default constructor

A **default constructor** is one that can be called with no arguments. If you write **no constructors
at all**, the compiler generates one for you (it default-initializes each member, which for an `int`
without an initializer means *garbage*).

As soon as you write **any** constructor, the compiler **stops** generating the default one:

```cpp compile-error
class Point {
    int x_, y_;
public:
    Point(int x, int y) : x_(x), y_(y) {}
};

int main() {
    Point p;   // error: no matching function for call to 'Point::Point()'
}
```

If you still want one, write it, or ask for the compiler's version with `= default` (below).

## Member initializer lists

The constructors above **assign** to members inside the body. By the time the body runs, though, every
member has *already been created*. The right way is a **member initializer list**: a colon after the
parameter list, followed by `member(value)` or `member{value}` entries, separated by commas.

```cpp
class Point {
    int x_;
    int y_;
public:
    Point(int x, int y) : x_(x), y_(y) {}   // initialize, don't assign
    //                  ^^^^^^^^^^^^^^^ initializer list; the body {} is empty
};
```

Why bother? Four reasons:

1. **`const` members and reference members must be initialized**, and can't be assigned later.
2. **Members whose type has no default constructor** can only be built in the initializer list.
3. **Efficiency:** assigning in the body first default-constructs the member, then overwrites it. For a
   `std::string` or `std::vector` that's wasted work.
4. It's **the only place** to pass arguments to a base class constructor (see the Inheritance module).

```cpp run
#include <iostream>
#include <string>

class Order {
private:
    const int id_;             // const: must be initialized, can never change
    std::string& log_;         // reference: must be bound at creation
    std::string item_;

public:
    Order(int id, std::string& log, const std::string& item)
        : id_(id), log_(log), item_(item) {
        log_ += "created " + std::to_string(id_) + "; ";
    }

    void print() const { std::cout << "#" << id_ << ": " << item_ << '\n'; }
};

int main() {
    std::string log;
    Order a(1, log, "book");
    Order b(2, log, "lamp");
    a.print();
    b.print();
    std::cout << log << '\n';
}
```

```output
#1: book
#2: lamp
created 1; created 2;
```

Assigning a `const` member in the body instead fails:

```cpp compile-error
class Order {
    const int id_;
public:
    Order(int id) {
        id_ = id;    // error: uninitialized const member / assignment of read-only member
    }
};

int main() { Order o(1); }
```

> **Note:** In the initializer list `x_(x)`, the name outside the parentheses is always the member and
> the name inside is looked up normally, so the parameter wins. That's why `Point(int x, int y) : x(x), y(y) {}`
> also works when members and parameters share names. It's legal, but distinct names are clearer.

### Initialization order is declaration order

Members are initialized **in the order they are declared in the class**, *not* the order you write them
in the initializer list. This matters when one member is computed from another:

```cpp
class Range {
    int size_;     // declared first, so initialized FIRST
    int start_;
    int end_;
public:
    Range(int s, int e) : start_(s), end_(e), size_(end_ - start_) {}
    // BUG: size_ is initialized first, reading end_ and start_ before they have values
};
```

GCC warns about any initializer list written in a different order than the declarations (`-Wreorder`,
part of `-Wall`). Here's a harmless example that still triggers it:

```cpp run warns
#include <iostream>

class Pair {
    int a_;
    int b_;
public:
    Pair(int a, int b) : b_(b), a_(a) {}   // warning: 'Pair::b_' will be initialized after 'int Pair::a_'
    int sum() const { return a_ + b_; }
};

int main() {
    Pair p(1, 2);
    std::cout << p.sum() << '\n';
}
```

**Rule:** always write the initializer list in declaration order, and avoid initializing one member
from another when you can use the parameters instead (`size_(e - s)`).

## Default member initializers

Since C++11 you can give a member a default value right where it's declared, with `=` or braces.
Every constructor that doesn't mention that member in its initializer list uses the default:

```cpp run
#include <iostream>
#include <string>

class Settings {
private:
    int volume_ = 50;               // default member initializer
    bool muted_{false};             // brace form
    std::string theme_ = "light";

public:
    Settings() = default;                         // uses all the defaults
    Settings(int volume) : volume_(volume) {}     // overrides volume_ only

    void print() const {
        std::cout << volume_ << ' ' << muted_ << ' ' << theme_ << '\n';
    }
};

int main() {
    Settings a;
    Settings b(80);
    a.print();
    b.print();
}
```

```output
50 0 light
80 0 light
```

> **Tip:** Give every member of a built-in type (`int`, `double`, pointers, `bool`) a default member
> initializer. Then no constructor can accidentally leave it holding garbage.

## Constructor overloading and delegating constructors

You can have as many constructors as you want, as long as their parameter lists differ. To avoid
duplicating logic, one constructor can **delegate** to another by calling it in the initializer list.
The target runs first, then the delegating constructor's body:

```cpp run
#include <iostream>
#include <iomanip>

class Time {
private:
    int h_, m_, s_;

public:
    Time(int h, int m, int s) : h_(h % 24), m_(m % 60), s_(s % 60) {
        std::cout << "main constructor\n";
    }
    Time(int h, int m) : Time(h, m, 0) {}          // delegates
    Time() : Time(0, 0, 0) {                        // delegates, then runs its body
        std::cout << "default constructor body\n";
    }

    void print() const {
        std::cout << std::setfill('0') << std::setw(2) << h_ << ':'
                  << std::setw(2) << m_ << ':' << std::setw(2) << s_ << '\n';
    }
};

int main() {
    Time a(9, 5, 30);
    Time b(14, 45);
    Time c;
    a.print();
    b.print();
    c.print();
}
```

```output
main constructor
main constructor
main constructor
default constructor body
09:05:30
14:45:00
00:00:00
```

A delegating constructor's initializer list must contain **only** the delegation: you can't also
initialize members there.

Default arguments are another way to cover several cases with one constructor:
`Time(int h = 0, int m = 0, int s = 0)` acts as a default constructor and as 1-, 2-, and 3-argument
constructors.

## `explicit` and implicit conversions

A constructor that can be called with **one argument** is also a **converting constructor**: the
compiler will silently use it to turn that argument's type into your class.

```cpp run
#include <iostream>

class Meters {
    double value_;
public:
    Meters(double v) : value_(v) {}          // not explicit: converts double -> Meters
    double value() const { return value_; }
};

void printDistance(Meters m) {
    std::cout << m.value() << " m\n";
}

int main() {
    printDistance(Meters(3.5));   // clearly intended
    printDistance(42);            // also compiles! 42 -> double -> Meters, silently
    Meters m = 7;                 // copy-initialization also converts
    std::cout << m.value() << '\n';
}
```

```output
3.5 m
42 m
7
```

`printDistance(42)` compiles, but was `42` meant to be meters? feet? a count? Implicit conversions
like this hide bugs. Mark single-argument constructors **`explicit`** to forbid them:

```cpp compile-error
class Meters {
    double value_;
public:
    explicit Meters(double v) : value_(v) {}
};

void printDistance(Meters) {}

int main() {
    printDistance(Meters(3.5));   // OK: explicit construction
    printDistance(42);            // error: could not convert '42' from 'int' to 'Meters'
    Meters m = 7;                 // error: conversion from 'int' to non-scalar type 'Meters' requested
}
```

**Rule:** make every constructor that can take a single argument `explicit`, unless you really want
the implicit conversion (like `std::string` from `"text"`, which is intentionally implicit).

## `= default` and `= delete`

- **`= default`** asks the compiler to generate the usual version of a special member function. Most
  often used to bring back the default constructor after writing another one.
- **`= delete`** forbids a function. Calling it is a compile error. It works on *any* function, which
  makes it useful for blocking unwanted conversions.

```cpp compile-error
class Percent {
    int value_ = 0;
public:
    Percent() = default;                      // keep the default constructor
    explicit Percent(int v) : value_(v) {}
    Percent(double) = delete;                 // don't allow Percent(0.5)
};

int main() {
    Percent a;          // OK
    Percent b(42);      // OK
    Percent c(0.5);     // error: use of deleted function 'Percent::Percent(double)'
}
```

You'll use `= delete` a lot with copy operations later in this module (to make a class non-copyable).

## Brace initialization of objects

There are several ways to write object creation. With a class that has constructors, they all call a
constructor:

```cpp run
#include <iostream>

class Point {
    int x_ = 0, y_ = 0;
public:
    Point() = default;
    Point(int x, int y) : x_(x), y_(y) {}
    void print() const { std::cout << x_ << ',' << y_ << ' '; }
};

int main() {
    Point a;             // default constructor
    Point b{};           // default constructor (value-initialization)
    Point c(1, 2);       // direct-initialization with parentheses
    Point d{3, 4};       // direct-list-initialization (braces)
    Point e = {5, 6};    // copy-list-initialization (not allowed if the constructor is explicit)
    Point f = Point(7, 8);
    auto g = Point{9, 10};
    a.print(); b.print(); c.print(); d.print(); e.print(); f.print(); g.print();
    std::cout << '\n';
}
```

```output
0,0 0,0 1,2 3,4 5,6 7,8 9,10
```

Braces have two advantages: they **reject narrowing** conversions (`Point p{1.5, 2};` is an error), and
they avoid the **most vexing parse**:

```cpp
Point p();    // NOT an object! Declares a function named p that returns a Point.
Point q{};    // an object, default-constructed
```

One caveat: if a class has a constructor taking `std::initializer_list` (like `std::vector`), braces
**prefer** it. `std::vector<int> v(3, 1);` is `{1, 1, 1}`, but `std::vector<int> w{3, 1};` is `{3, 1}`.

> **Note:** A struct with only public members and no constructors is an **aggregate**, which is why
> `Point p{1, 2};` worked for plain structs before you knew about constructors. Adding a user-written
> constructor makes it a non-aggregate, so braces then call a constructor instead.

:::quiz
In what order are members initialized?

```cpp
class C {
    int a_;
    int b_;
public:
    C() : b_(1), a_(2) {}
};
```

- [x] `a_` first, then `b_` (declaration order)
- [ ] `b_` first, then `a_` (initializer-list order)
- [ ] It's unspecified
- [ ] Alphabetical order

Members are always initialized in the order they're declared in the class. GCC's `-Wreorder` warns
that the list is written in a different order.
:::

:::quiz
Which members **must** be initialized in the member initializer list (or with a default member initializer)? (select all that apply)

- [x] A `const int` member
- [x] An `int&` member
- [x] A member of a class type that has no default constructor
- [ ] A `std::string` member

`const` and reference members can't be assigned after creation, and a type without a default
constructor can't be created without arguments. A `std::string` can be assigned in the body (it's
just less efficient).
:::

:::quiz
`class Id { public: explicit Id(int v); };` and `void use(Id id);`. Which calls compile? (select all that apply)

- [ ] `use(5);`
- [x] `use(Id(5));`
- [x] `use(Id{5});`
- [ ] `Id x = 5;`

`explicit` forbids implicit conversion from `int`, including copy-initialization with `=`. Writing the
type name explicitly is fine.
:::

:::exercise Point constructors {easy}
Complete the `Point` class with:

- a **default constructor** that makes the point `(0, 0)`,
- a constructor `Point(int x, int y)` that uses a **member initializer list**,
- `void print() const` that prints `(x, y)` and a newline.

**Input:** two integers `x y`.
**Output:** two lines: the default point, then the point built from the input. For input `3 -4`:

```
(0, 0)
(3, -4)
```

```cpp starter
#include <iostream>

class Point {
private:
    int x_;
    int y_;

public:
    // add the constructors here

    void print() const {
        // print (x, y)
    }
};

int main() {
    int x, y;
    std::cin >> x >> y;
    Point origin;
    // Point p(x, y);
    origin.print();
    // p.print();
}
```

```cpp solution
#include <iostream>

class Point {
private:
    int x_;
    int y_;

public:
    Point() : x_(0), y_(0) {}
    Point(int x, int y) : x_(x), y_(y) {}

    void print() const {
        std::cout << '(' << x_ << ", " << y_ << ")\n";
    }
};

int main() {
    int x, y;
    std::cin >> x >> y;
    Point origin;
    Point p(x, y);
    origin.print();
    p.print();
}
```

```hint
The syntax is `Point(int x, int y) : x_(x), y_(y) {}`.
```

```stdin
3 -4
```

```expected
(0, 0)
(3, -4)
```

```stdin
0 0
```

```expected hidden
(0, 0)
(0, 0)
```

```checks
must \)\s*:\s*x_\s*[({] :: Initialize x_ in a member initializer list.
must Point\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\) :: Write a Point(int, int) constructor.
```
:::

:::exercise Delegating clock {easy}
Write a `Clock` class with:

- a main constructor `Clock(int h, int m, int s)` that stores the time,
- `Clock(int h, int m)` and `Clock(int h)` that **delegate** to the main constructor (missing parts are 0),
- `void print() const` that prints the time as `HH:MM:SS` with two digits each.

**Input:** a count `k` (1, 2, or 3), then `k` integers. Use the constructor with that many arguments.
**Output:** the time as `HH:MM:SS`. All input values are valid (hours 0-23, minutes and seconds 0-59).

```cpp starter
#include <iostream>
#include <iomanip>

class Clock {
private:
    int h_ = 0, m_ = 0, s_ = 0;

public:
    // constructors here

    void print() const {
        std::cout << std::setfill('0') << std::setw(2) << h_ << ':'
                  << std::setw(2) << m_ << ':' << std::setw(2) << s_ << '\n';
    }
};

int main() {
    int k;
    std::cin >> k;
    int a = 0, b = 0, c = 0;
    if (k >= 1) std::cin >> a;
    if (k >= 2) std::cin >> b;
    if (k >= 3) std::cin >> c;
    // create the Clock with the matching constructor and print it
}
```

```cpp solution
#include <iostream>
#include <iomanip>

class Clock {
private:
    int h_ = 0, m_ = 0, s_ = 0;

public:
    Clock(int h, int m, int s) : h_(h), m_(m), s_(s) {}
    Clock(int h, int m) : Clock(h, m, 0) {}
    explicit Clock(int h) : Clock(h, 0, 0) {}

    void print() const {
        std::cout << std::setfill('0') << std::setw(2) << h_ << ':'
                  << std::setw(2) << m_ << ':' << std::setw(2) << s_ << '\n';
    }
};

int main() {
    int k;
    std::cin >> k;
    int a = 0, b = 0, c = 0;
    if (k >= 1) std::cin >> a;
    if (k >= 2) std::cin >> b;
    if (k >= 3) std::cin >> c;
    if (k == 3) {
        Clock t(a, b, c);
        t.print();
    } else if (k == 2) {
        Clock t(a, b);
        t.print();
    } else {
        Clock t(a);
        t.print();
    }
}
```

```hint
A delegating constructor looks like `Clock(int h, int m) : Clock(h, m, 0) {}`.
```

```hint
Since a variable declared inside an `if` block only lives in that block, create and print the clock inside each branch.
```

```stdin
3
9 5 30
```

```expected
09:05:30
```

```stdin
2
14 7
```

```expected hidden
14:07:00
```

```stdin
1
0
```

```expected hidden
00:00:00
```

```checks
must \)\s*:\s*Clock\s*[({] :: Delegate to another constructor with : Clock(...).
```
:::

:::exercise Reduced fraction {medium}
Write a `Fraction` class whose constructor `Fraction(int num, int den)` stores the fraction in
**lowest terms** with a **positive denominator**. Also give it an **`explicit`** single-argument
constructor `Fraction(int whole)` that delegates to make `whole/1`. Add `void print() const` that
prints `num/den`.

Use `std::gcd` from `<numeric>` (it returns a non-negative result). Zero should print as `0/1`.

**Input:** two integers `a b` (`b` is never 0).
**Output:** two lines: the fraction `a/b` reduced, then the fraction built from just `a`.

For `6 -8` the output is:

```
-3/4
6/1
```

```cpp starter
#include <iostream>
#include <numeric>

class Fraction {
private:
    int num_ = 0;
    int den_ = 1;

public:
    Fraction(int num, int den) : num_(num), den_(den) {}
    // add the explicit Fraction(int whole) constructor

    void print() const { std::cout << num_ << '/' << den_ << '\n'; }
};

int main() {
    int a, b;
    std::cin >> a >> b;
    Fraction f(a, b);
    f.print();
    // Fraction w(a);
    // w.print();
}
```

```cpp solution
#include <iostream>
#include <numeric>

class Fraction {
private:
    int num_ = 0;
    int den_ = 1;

public:
    Fraction(int num, int den) : num_(num), den_(den) {
        if (den_ < 0) {
            num_ = -num_;
            den_ = -den_;
        }
        int g = std::gcd(num_, den_);
        if (g != 0) {
            num_ /= g;
            den_ /= g;
        }
    }
    explicit Fraction(int whole) : Fraction(whole, 1) {}

    void print() const { std::cout << num_ << '/' << den_ << '\n'; }
};

int main() {
    int a, b;
    std::cin >> a >> b;
    Fraction f(a, b);
    f.print();
    Fraction w(a);
    w.print();
}
```

```hint
In the constructor body: if the denominator is negative, flip both signs. Then divide both by `std::gcd(num_, den_)`.
```

```hint
`std::gcd(0, 5)` is `5`, so `0/5` becomes `0/1` automatically.
```

```stdin
6 -8
```

```expected
-3/4
6/1
```

```stdin
0 5
```

```expected hidden
0/1
0/1
```

```stdin
-10 -4
```

```expected hidden
5/2
-10/1
```

```checks
must \bexplicit\s+Fraction\s*\( :: Mark the single-argument constructor explicit.
must \)\s*:\s*Fraction\s*[({] :: Make Fraction(int) delegate to Fraction(int, int).
```
:::

:::exercise Normalizing dates {hard}
Write a `Date` class whose constructors **always produce a valid date**, however strange the
arguments. Out-of-range parts roll over the way a calendar does:

- months outside `1..12` move into the next or previous years (month `13` of 2023 is January 2024,
  month `0` of 2023 is December 2022, month `-11` of 2023 is January 2022),
- then days outside the month move into the following or preceding months (February 30 is March 1 or 2,
  day `0` is the last day of the previous month, day `-30` of January is December 1 of the previous year).

Use the Gregorian leap-year rule: a year is a leap year if it is divisible by 4, except years divisible by
100, which are leap years only if they are also divisible by 400 (2000 yes, 1900 no).

Provide `Date(int y, int m, int d)` (does the normalizing), `Date(int y, int m)` (day 1) and an
**`explicit`** `Date(int y)` (January 1), the last two **delegating** to the first, and a
`void print() const` that prints `YYYY-MM-DD`.

**Input:** lines until end of input, each a count `k` (1, 2 or 3) followed by `k` integers. Use the
constructor with that many arguments. Every result has a year between 1000 and 9999.
**Output:** one normalized date per line.

```cpp starter
#include <iomanip>
#include <iostream>

class Date {
    int y_ = 1970, m_ = 1, d_ = 1;
public:
    void print() const {
        std::cout << std::setfill('0') << std::setw(4) << y_ << '-' << std::setw(2) << m_ << '-'
                  << std::setw(2) << d_ << '\n';
    }
};

int main() {
    int k;
    while (std::cin >> k) {
        int a = 0, b = 0, c = 0;
        if (k >= 1) std::cin >> a;
        if (k >= 2) std::cin >> b;
        if (k >= 3) std::cin >> c;
        Date().print();   // build the Date with the matching constructor
    }
}
```

```cpp solution
#include <iomanip>
#include <iostream>

class Date {
    int y_ = 1970, m_ = 1, d_ = 1;

    static bool isLeap(int y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }
    static int daysIn(int y, int m) {
        static const int days[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        return m == 2 && isLeap(y) ? 29 : days[m - 1];
    }

public:
    Date(int y, int m, int d) {
        // months: count from a zero-based month index, flooring for negatives
        long long total = static_cast<long long>(y) * 12 + (m - 1);
        long long yy = total >= 0 ? total / 12 : (total - 11) / 12;
        y_ = static_cast<int>(yy);
        m_ = static_cast<int>(total - yy * 12) + 1;
        // days: walk month by month
        while (d > daysIn(y_, m_)) {
            d -= daysIn(y_, m_);
            if (++m_ == 13) { m_ = 1; ++y_; }
        }
        while (d < 1) {
            if (--m_ == 0) { m_ = 12; --y_; }
            d += daysIn(y_, m_);
        }
        d_ = d;
    }
    Date(int y, int m) : Date(y, m, 1) {}
    explicit Date(int y) : Date(y, 1, 1) {}

    void print() const {
        std::cout << std::setfill('0') << std::setw(4) << y_ << '-' << std::setw(2) << m_ << '-'
                  << std::setw(2) << d_ << '\n';
    }
};

int main() {
    int k;
    while (std::cin >> k) {
        int a = 0, b = 0, c = 0;
        if (k >= 1) std::cin >> a;
        if (k >= 2) std::cin >> b;
        if (k >= 3) std::cin >> c;
        if (k == 3) Date(a, b, c).print();
        else if (k == 2) Date(a, b).print();
        else Date(a).print();
    }
}
```

```hint
Normalize the month first, then the day. For the month, think of `y * 12 + (m - 1)` as "months since
year 0" and split it back into a year and a month. Careful: in C++, `-1 / 12` is `0` and `-1 % 12` is
`-1` (division truncates toward zero), so negative month counts need extra care.
```

```hint
For the day, loop: while the day is larger than the current month's length, subtract that length and
move to the next month; while it's less than 1, move to the previous month and add its length.
```

```stdin
3 2024 2 30
3 2023 2 29
3 2024 3 0
2 2023 14
1 1999
```

```expected
2024-03-01
2023-03-01
2024-02-29
2024-02-01
1999-01-01
```

```stdin
3 1900 2 29
3 2000 2 29
3 2023 0 15
3 2023 -11 1
3 2024 1 -30
3 2023 12 32
```

```expected hidden
1900-03-01
2000-02-29
2022-12-15
2022-01-01
2023-12-01
2024-01-01
```

```stdin
3 2024 1 366
3 2023 1 400
3 2023 25 1
3 2024 3 -365
2 2024 -24
```

```expected hidden
2024-12-31
2024-02-04
2025-01-01
2023-03-01
2021-12-01
```

```checks
must explicit\s+Date\s*\(\s*int\s+\w+\s*\) :: Mark the one-argument constructor explicit.
must \)\s*:\s*Date\s*\( :: Make the shorter constructors delegate to Date(int, int, int).
```
:::
