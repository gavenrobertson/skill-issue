---
title: Operator Overloading
summary: Make your types work with + - * == <=> << >> [] () ++ and more, choosing between member and non-member operators, and the rules and guidelines that keep them sane.
---

## Operators are just functions

When you write `a + b` with two `int`s, the compiler emits an add instruction. When you write `a + b`
with two `std::string`s, it calls a **function** named `operator+`. You can write such functions for
your own types too. That's **operator overloading**, and it's what lets `std::string`, `std::vector`,
`std::cout`, and `std::chrono` feel like built-in types.

For a binary operator `@`, the expression `a @ b` becomes one of:

```cpp
operator@(a, b)      // a non-member (free) function
a.operator@(b)       // a member function of a's class: 'a' is *this, 'b' is the parameter
```

For a unary operator, `@a` becomes `operator@(a)` or `a.operator@()`.

```cpp run
#include <iostream>

struct Vec2 {
    double x = 0, y = 0;
};

Vec2 operator+(const Vec2& a, const Vec2& b) {    // a non-member operator
    return {a.x + b.x, a.y + b.y};
}

int main() {
    Vec2 a{1, 2}, b{10, 20};
    Vec2 c = a + b;                 // calls operator+(a, b)
    Vec2 d = operator+(a, b);       // the same call, written out (legal, but nobody does this)
    std::cout << c.x << ',' << c.y << ' ' << d.x << ',' << d.y << '\n';
}
```

```output
11,22 11,22
```

## The rules

- At least one operand must be a **class or enum type**. You can't redefine `int + int`.
- You **can't invent** new operators (no `**` or `<>`), and you can't change an operator's
  **precedence**, **associativity**, or **number of operands**.
- These **cannot** be overloaded at all: `::` (scope), `.` (member access), `.*` (member pointer access),
  `?:` (conditional), `sizeof`, `alignof`, `typeid`, `noexcept`, and the preprocessor's `#` and `##`.
- `=` (assignment), `[]`, `()`, `->`, and conversion operators **must be member functions**.

## Member or non-member?

| Operator | Usually written as | Why |
| --- | --- | --- |
| `=` `[]` `()` `->` conversions | member | the language requires it |
| `+=` `-=` `*=` `/=` ... | member, returns `*this` by reference | they modify the left operand |
| `++` `--` unary `-` | member | they act on one object |
| `+` `-` `*` `/` `==` `<=>` | **non-member** (often a hidden friend) | symmetric: both sides treated alike |
| `<<` `>>` for streams | **non-member** | the left operand is a stream, not your class |

Why non-members for symmetric operators? A member operator's left operand must already **be** your
class; the compiler won't convert it. A non-member allows conversions on **both** sides, and is the only
way to support "other type on the left", like `2 * v`:

```cpp compile-error
struct Vec2 {
    double x = 0, y = 0;
    Vec2 operator*(double k) const { return {x * k, y * k}; }   // member: handles v * 2 only
};

int main() {
    Vec2 v{1, 2};
    Vec2 a = v * 2;      // OK: v.operator*(2)
    Vec2 b = 2 * v;      // error: no match for 'operator*' (operand types are 'int' and 'Vec2')
}
```

## Arithmetic operators

The standard pattern: implement the **compound assignment** (`+=`) as a member that modifies `*this`,
then implement the plain operator (`+`) as a non-member **in terms of it**. That way the real logic
lives in one place.

```cpp run
#include <iostream>

class Vec2 {
public:
    double x = 0, y = 0;

    Vec2() = default;
    Vec2(double x_, double y_) : x(x_), y(y_) {}

    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }
    Vec2& operator-=(const Vec2& o) { x -= o.x; y -= o.y; return *this; }
    Vec2& operator*=(double k)      { x *= k;   y *= k;   return *this; }

    Vec2 operator-() const { return {-x, -y}; }        // unary minus: -v
};

// Non-members built from the compound versions. 'a' is taken BY VALUE: it's our copy to modify.
Vec2 operator+(Vec2 a, const Vec2& b) { a += b; return a; }
Vec2 operator-(Vec2 a, const Vec2& b) { a -= b; return a; }
Vec2 operator*(Vec2 v, double k)      { v *= k; return v; }
Vec2 operator*(double k, Vec2 v)      { v *= k; return v; }   // 2 * v

void print(const Vec2& v) { std::cout << '(' << v.x << ", " << v.y << ")\n"; }

int main() {
    Vec2 a(1, 2), b(3, 4);
    print(a + b);
    print(b - a);
    print(a * 3);
    print(3 * a);
    print(-a);
    a += b;
    a += b;            // compound assignment modifies a
    print(a);
    print((a + b) * 0.5 - Vec2(1, 1));   // precedence is the built-in one: * before -
}
```

```output
(4, 6)
(2, 2)
(3, 6)
(3, 6)
(-1, -2)
(7, 10)
(4, 6)
```

Return types matter: `+=` returns `Vec2&` (the modified left side, so `(a += b) += c` works like it does
for `int`), while `+` returns a **new** `Vec2` by value.

## Comparison operators: `==` and `<=>` (C++20)

### Equality

`operator==` returns `bool`. In C++20, once you have `==`, the compiler **automatically** rewrites
`a != b` as `!(a == b)`, so you don't write `!=` yourself. Even better, you can ask for the
memberwise version with `= default`:

```cpp
struct Point {
    int x = 0, y = 0;
    bool operator==(const Point&) const = default;   // compares x, then y
};
// p == q and p != q both work now
```

### Three-way comparison: the "spaceship" `<=>`

`a <=> b` compares once and returns an **ordering** object that says whether `a` is less than, equal
to, or greater than `b`. You compare the result against `0`: `(a <=> b) < 0` means `a < b`. Defining
`<=>` gives you **all four** of `<`, `<=`, `>`, `>=` for free; the compiler rewrites `a < b` as
`(a <=> b) < 0`.

Defaulting it compares members **in declaration order** (lexicographically), and a defaulted `<=>`
also gives you a defaulted `==`:

```cpp run
#include <compare>
#include <iostream>
#include <string>

struct Version {
    int major = 0;
    int minor = 0;
    int patch = 0;

    auto operator<=>(const Version&) const = default;   // gives < <= > >= == !=
};

int main() {
    Version a{1, 4, 2}, b{1, 10, 0}, c{1, 4, 2};
    std::cout << std::boolalpha;
    std::cout << (a < b) << ' ' << (a > b) << ' ' << (a <= c) << '\n';
    std::cout << (a == c) << ' ' << (a != b) << '\n';
    std::cout << ((a <=> b) < 0) << '\n';      // using the ordering result directly
}
```

```output
true false true
true true
true
```

The result type says what kind of ordering it is:

| Type | Meaning | Example |
| --- | --- | --- |
| `std::strong_ordering` | equal values are indistinguishable | `int`, `std::string` |
| `std::weak_ordering` | equivalent values may differ | case-insensitive strings |
| `std::partial_ordering` | some values are unordered | `double` (NaN) |

`auto` lets the compiler pick the right one from the members. To compare differently from member
order, write `<=>` yourself. A **hand-written** `<=>` does **not** give you `==`, so default or write
that too:

```cpp run
#include <compare>
#include <iostream>
#include <string>

class Employee {
    std::string name_;
    int salary_;
public:
    Employee(std::string n, int s) : name_(std::move(n)), salary_(s) {}

    // Order by salary first, then by name.
    std::strong_ordering operator<=>(const Employee& o) const {
        if (auto cmp = salary_ <=> o.salary_; cmp != 0) return cmp;
        return name_ <=> o.name_;
    }
    bool operator==(const Employee& o) const = default;   // not implied by a custom <=>
};

int main() {
    Employee ann("Ann", 5000), bob("Bob", 4000), cy("Cy", 5000);
    std::cout << std::boolalpha;
    std::cout << (bob < ann) << ' ' << (ann < cy) << ' ' << (ann == cy) << '\n';
}
```

```output
true true false
```

> **Note:** Before C++20 you had to write all six comparison operators by hand (usually `==` and `<`,
> and the other four in terms of them). You'll see that in older code.

## Stream operators `<<` and `>>`

To print your type with `std::cout << obj`, write a **non-member** `operator<<` whose left operand is
`std::ostream&`. It must **return the stream** so calls can chain (`std::cout << a << b` is
`(std::cout << a) << b`). Make it a friend if it needs private data:

```cpp run
#include <iostream>
#include <sstream>

class Fraction {
    int num_, den_;
public:
    Fraction(int n = 0, int d = 1) : num_(n), den_(d) {}

    friend std::ostream& operator<<(std::ostream& os, const Fraction& f) {
        return os << f.num_ << '/' << f.den_;      // write to os, not std::cout!
    }

    friend std::istream& operator>>(std::istream& is, Fraction& f) {
        int n, d;
        char slash;
        if (is >> n >> slash >> d && slash == '/' && d != 0) {
            f = Fraction(n, d);                    // only modify f on success
        } else {
            is.setstate(std::ios::failbit);        // report bad input like built-in types do
        }
        return is;
    }
};

int main() {
    Fraction half(1, 2);
    std::cout << "half = " << half << '\n';

    std::istringstream input("3/4 oops");     // a stream reading from a string (no stdin needed)
    Fraction f;
    if (input >> f) std::cout << "read " << f << '\n';
    if (!(input >> f)) std::cout << "bad input, f is still " << f << '\n';
}
```

```output
half = 1/2
read 3/4
bad input, f is still 3/4
```

Writing to `os` rather than `std::cout` is important: the same operator then works for files,
string streams, and `std::cerr`. The `>>` operator takes its object by **non-const** reference
because it fills it in.

## Subscript `[]`

`operator[]` must be a member. Provide **two** versions, as you learned with const overloading: a
non-const one returning a reference (so `obj[i] = x` works) and a const one for const objects:

```cpp run
#include <iostream>
#include <string>
#include <vector>

class Gradebook {
    std::vector<int> scores_;
public:
    explicit Gradebook(std::size_t n) : scores_(n, 0) {}

    int& operator[](std::size_t i) { return scores_[i]; }               // writable
    const int& operator[](std::size_t i) const { return scores_[i]; }   // read-only

    std::size_t size() const { return scores_.size(); }
};

int total(const Gradebook& g) {          // const reference: uses the const operator[]
    int sum = 0;
    for (std::size_t i = 0; i < g.size(); ++i) sum += g[i];
    return sum;
}

int main() {
    Gradebook g(3);
    g[0] = 90;
    g[1] = 75;
    g[2] = 88;
    g[1] += 5;
    std::cout << g[1] << ' ' << total(g) << '\n';
}
```

```output
80 258
```

> **Note:** Before C++23, `operator[]` takes exactly one argument. C++23 allows several, so a matrix
> can support `m[row, col]`.

## Function call `()`

Overloading `operator()` makes objects **callable** like functions. Such objects are called
**function objects** or **functors**. Unlike a plain function, they can carry **state**:

```cpp run
#include <iostream>

class Multiplier {
    int factor_;
public:
    explicit Multiplier(int f) : factor_(f) {}
    int operator()(int x) const { return x * factor_; }   // obj(x)
};

class Counter {
    int calls_ = 0;
public:
    int operator()() { return ++calls_; }                  // any number of parameters is allowed
};

int main() {
    Multiplier triple(3);
    std::cout << triple(5) << ' ' << triple(10) << '\n';   // looks like a function call

    Counter next;
    next();
    next();
    std::cout << next() << '\n';
}
```

```output
15 30
3
```

Function objects are how you customize standard algorithms (sorting order, predicates). Lambdas,
covered in a later module, are a shorthand that creates exactly this kind of object.

## Increment and decrement

`++` and `--` each come in two forms. The **postfix** form is told apart by a dummy `int` parameter
that you never use:

```cpp run
#include <iostream>

class Counter {
    int value_ = 0;
public:
    Counter& operator++() {           // prefix ++c: increment, return the object itself
        ++value_;
        return *this;
    }
    Counter operator++(int) {         // postfix c++: the 'int' just marks it as postfix
        Counter old = *this;          // save the old value
        ++*this;                      // reuse prefix
        return old;                   // return the OLD value, by value
    }
    int value() const { return value_; }
};

int main() {
    Counter c;
    Counter a = c++;                  // a gets the old value (0), c becomes 1
    Counter b = ++c;                  // c becomes 2, b gets the new value
    std::cout << a.value() << ' ' << b.value() << ' ' << c.value() << '\n';
}
```

```output
0 2 2
```

Postfix has to make a copy, which is why `++it` is the habit for iterators and class types.

## Conversion operators

A conversion operator lets your object convert to another type. It has **no return type** written
before it (the type is in the name) and takes no parameters: `operator double() const`.

Implicit conversions are dangerous for the same reasons as non-explicit constructors, so mark them
**`explicit`**. The most common one is **`explicit operator bool`**, for "is this object valid/non-empty?".
Even though it's explicit, it's still used automatically in **conditions** (`if`, `while`, `!`, `&&`,
`||`, `?:`), which is exactly where you want it:

```cpp run
#include <iostream>

class Ratio {
    int num_, den_;
public:
    Ratio(int n, int d) : num_(n), den_(d) {}

    explicit operator bool() const { return den_ != 0; }    // valid?
    explicit operator double() const { return static_cast<double>(num_) / den_; }
};

int main() {
    Ratio good(3, 4), bad(1, 0);
    if (good) std::cout << "good is valid\n";               // OK: contextual conversion
    if (!bad) std::cout << "bad is invalid\n";
    double d = static_cast<double>(good);                    // explicit: must ask for it
    std::cout << d << '\n';
    // double e = good;       // error: explicit conversion required
    // int n = good + 1;      // error, and that's the point
}
```

```output
good is valid
bad is invalid
0.75
```

Without `explicit`, `operator bool` would let `good + 1` compile (bool promotes to int, giving `2`),
and `good == bad` would compare two bools. Those surprising conversions are why `std::unique_ptr`,
`std::optional`, and the streams all use `explicit operator bool`.

## Guidelines

- **Keep the usual meaning.** `+` should add, `==` should compare for equality, `<<` on a stream should
  print. Surprising operators make code harder to read, not easier.
- **Be consistent.** If you provide `+`, provide `+=`, and make `a + b` equal `a += b`. Make `<`, `==`,
  and `<=>` agree.
- **Use canonical signatures:**

  | Operator | Signature |
  | --- | --- |
  | `a += b` | `T& T::operator+=(const T& b)` |
  | `a + b` | `T operator+(T a, const T& b)` (non-member) |
  | `a == b` | `bool operator==(const T&) const = default;` (or custom) |
  | `a <=> b` | `auto operator<=>(const T&) const = default;` |
  | `os << a` | `std::ostream& operator<<(std::ostream&, const T&)` |
  | `is >> a` | `std::istream& operator>>(std::istream&, T&)` |
  | `a[i]` | `T& operator[](size_t)` and `const T& operator[](size_t) const` |
  | `++a` / `a++` | `T& operator++()` / `T operator++(int)` |

- **Don't overload `&&`, `||`, or `,`.** The built-in `&&` and `||` short-circuit; overloaded versions
  are ordinary function calls that always evaluate both sides. Don't overload unary `&` (address-of) either.
- Assignment `operator=` has its own rules; it's covered in the next lesson.

:::quiz
Why is `operator<<` for printing almost always a non-member function?

- [ ] Member functions can't return references
- [x] Its left operand is `std::ostream`, not your class, so it can't be a member of your class
- [ ] Non-member functions are faster
- [ ] The standard forbids member `operator<<`

For `a.operator<<(b)`, `a` would have to be your object, giving `obj << std::cout`. To get
`std::cout << obj`, the operator must be a free function (often a friend).
:::

:::quiz
With `auto operator<=>(const T&) const = default;` in a class, which operators can you use on two `T` objects? (select all that apply)

- [x] `<` and `>=`
- [x] `==` and `!=`
- [ ] `+`
- [ ] `<<` with `std::cout`

A defaulted `<=>` gives the four relational operators by rewriting, and also declares a defaulted `==`,
which in turn gives `!=`. Arithmetic and printing are unrelated.
:::

:::quiz
How does the compiler tell postfix `x++` apart from prefix `++x` when you overload them?

- [ ] Postfix is a non-member, prefix is a member
- [x] Postfix takes an extra unused `int` parameter
- [ ] Postfix returns `void`
- [ ] You can only overload one of them

`T operator++(int)` is postfix; `T& operator++()` is prefix. The `int` is a dummy that's always 0.
:::

:::exercise Vector arithmetic
Complete `Vec2` so `main` works:

- member `Vec2& operator+=(const Vec2&)`,
- non-member `Vec2 operator+(Vec2, const Vec2&)`, implemented with `+=`,
- `bool operator==` (you may `= default` it),
- non-member `std::ostream& operator<<(std::ostream&, const Vec2&)` printing `(x, y)`.

**Input:** four integers `x1 y1 x2 y2`.
**Output:** three lines: `a + b`, then `a` after `a += b`, then `equal` or `not equal` comparing the
updated `a` with `a + b` from the first line. For `1 2 3 4`:

```
(4, 6)
(4, 6)
equal
```

```cpp starter
#include <iostream>

struct Vec2 {
    long long x = 0, y = 0;
    // add operator+= and operator==
};

// add operator+ and operator<<

int main() {
    Vec2 a, b;
    std::cin >> a.x >> a.y >> b.x >> b.y;
    // Vec2 sum = a + b;
    // std::cout << sum << '\n';
    // a += b;
    // std::cout << a << '\n';
    // std::cout << (a == sum ? "equal" : "not equal") << '\n';
}
```

```cpp solution
#include <iostream>

struct Vec2 {
    long long x = 0, y = 0;

    Vec2& operator+=(const Vec2& o) {
        x += o.x;
        y += o.y;
        return *this;
    }
    bool operator==(const Vec2&) const = default;
};

Vec2 operator+(Vec2 a, const Vec2& b) {
    a += b;
    return a;
}

std::ostream& operator<<(std::ostream& os, const Vec2& v) {
    return os << '(' << v.x << ", " << v.y << ')';
}

int main() {
    Vec2 a, b;
    std::cin >> a.x >> a.y >> b.x >> b.y;
    Vec2 sum = a + b;
    std::cout << sum << '\n';
    a += b;
    std::cout << a << '\n';
    std::cout << (a == sum ? "equal" : "not equal") << '\n';
}
```

```hint
`operator+=` modifies `x` and `y` and ends with `return *this;`.
```

```hint
`std::ostream& operator<<(std::ostream& os, const Vec2& v) { return os << '(' << v.x << ", " << v.y << ')'; }`
```

```stdin
1 2 3 4
```

```expected
(4, 6)
(4, 6)
equal
```

```stdin
-5 0 5 0
```

```expected hidden
(0, 0)
(0, 0)
equal
```

```checks
must operator\s*\+=\s*\( :: Write operator+=.
must operator\s*\+\s*\( :: Write operator+.
must operator\s*<<\s*\( :: Write operator<< for printing.
must operator\s*==\s*\( :: Write (or default) operator==.
must cout\s*<<\s*sum :: Print the sum with std::cout << sum.
```
:::

:::exercise Money ordering
`Money` stores an amount in cents. Give it:

- a defaulted three-way comparison `auto operator<=>(const Money&) const = default;`
- a non-member `operator<<` that prints `$D.CC` (dollars, a dot, and exactly two digits of cents).
  All amounts are non-negative.

`main` finds the cheapest and most expensive amount using `<` and `>`.

**Input:** a count `n` (at least 1), then `n` amounts in cents.
**Output:** `min: $D.CC` and `max: $D.CC` on two lines.

```cpp starter
#include <iostream>
#include <vector>

class Money {
    long long cents_ = 0;
public:
    explicit Money(long long cents) : cents_(cents) {}
    long long cents() const { return cents_; }
    // add operator<=>
};

// add operator<<

int main() {
    int n;
    std::cin >> n;
    std::vector<Money> amounts;
    for (int i = 0; i < n; ++i) {
        long long c;
        std::cin >> c;
        amounts.push_back(Money(c));
    }
    Money lo = amounts[0], hi = amounts[0];
    // for (const Money& m : amounts) { if (m < lo) lo = m; if (m > hi) hi = m; }
    std::cout << "min: " << lo.cents() << '\n';
    std::cout << "max: " << hi.cents() << '\n';
}
```

```cpp solution
#include <compare>
#include <iomanip>
#include <iostream>
#include <vector>

class Money {
    long long cents_ = 0;
public:
    explicit Money(long long cents) : cents_(cents) {}
    long long cents() const { return cents_; }
    auto operator<=>(const Money&) const = default;
};

std::ostream& operator<<(std::ostream& os, const Money& m) {
    return os << '$' << m.cents() / 100 << '.' << std::setw(2) << std::setfill('0') << m.cents() % 100;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<Money> amounts;
    for (int i = 0; i < n; ++i) {
        long long c;
        std::cin >> c;
        amounts.push_back(Money(c));
    }
    Money lo = amounts[0], hi = amounts[0];
    for (const Money& m : amounts) {
        if (m < lo) lo = m;
        if (m > hi) hi = m;
    }
    std::cout << "min: " << lo << '\n';
    std::cout << "max: " << hi << '\n';
}
```

```hint
`#include <compare>` and add `auto operator<=>(const Money&) const = default;` inside the class.
```

```hint
For the cents, `std::setw(2) << std::setfill('0')` (from `<iomanip>`) pads `5` to `05`.
```

```stdin
4
1999 250 100000 7
```

```expected
min: $0.07
max: $1000.00
```

```stdin
1
0
```

```expected hidden
min: $0.00
max: $0.00
```

```checks
must operator\s*<=>\s*\( :: Define operator<=> (defaulting it is fine).
must operator\s*<<\s*\( :: Define operator<< for printing Money.
must \bm\s*<\s*lo\b|\blo\s*>\s*m\b :: Compare Money objects directly with < or >.
```
:::

:::exercise Fraction calculator
Build a `Fraction` class that is always stored **reduced with a positive denominator**, and supports:

- non-member `+ - * /` between two fractions,
- `operator>>` that reads the form `a/b` (e.g. `-3/4`),
- `operator<<` that prints `num/den` (whole numbers print with `/1`, e.g. `2/1`; zero is `0/1`).

**Input:** lines of the form `X op Y`, where `X` and `Y` are fractions and `op` is one of `+ - * /`,
until end of input. No denominator is 0, and you'll never divide by a zero fraction.
**Output:** one line per input line with the reduced result.

```cpp starter
#include <iostream>
#include <numeric>

class Fraction {
    long long num_ = 0, den_ = 1;
public:
    Fraction(long long n = 0, long long d = 1) : num_(n), den_(d) {}
    long long num() const { return num_; }
    long long den() const { return den_; }
};

// add operators here

int main() {
    char op;
    long long n1, d1, n2, d2;
    char slash;
    // replace with: Fraction a, b;  while (std::cin >> a >> op >> b) { ... }
    while (std::cin >> n1 >> slash >> d1 >> op >> n2 >> slash >> d2) {
        std::cout << "?\n";
    }
}
```

```cpp solution
#include <iostream>
#include <numeric>

class Fraction {
    long long num_ = 0, den_ = 1;
public:
    Fraction(long long n = 0, long long d = 1) : num_(n), den_(d) {
        if (den_ < 0) {
            num_ = -num_;
            den_ = -den_;
        }
        long long g = std::gcd(num_, den_);
        if (g != 0) {
            num_ /= g;
            den_ /= g;
        }
    }
    long long num() const { return num_; }
    long long den() const { return den_; }

    friend std::ostream& operator<<(std::ostream& os, const Fraction& f) {
        return os << f.num_ << '/' << f.den_;
    }
    friend std::istream& operator>>(std::istream& is, Fraction& f) {
        long long n, d;
        char slash;
        if (is >> n >> slash >> d && slash == '/' && d != 0) f = Fraction(n, d);
        else is.setstate(std::ios::failbit);
        return is;
    }
};

Fraction operator+(const Fraction& a, const Fraction& b) {
    return Fraction(a.num() * b.den() + b.num() * a.den(), a.den() * b.den());
}
Fraction operator-(const Fraction& a, const Fraction& b) {
    return Fraction(a.num() * b.den() - b.num() * a.den(), a.den() * b.den());
}
Fraction operator*(const Fraction& a, const Fraction& b) {
    return Fraction(a.num() * b.num(), a.den() * b.den());
}
Fraction operator/(const Fraction& a, const Fraction& b) {
    return Fraction(a.num() * b.den(), a.den() * b.num());
}

int main() {
    Fraction a, b;
    char op;
    while (std::cin >> a >> op >> b) {
        Fraction r;
        if (op == '+') r = a + b;
        else if (op == '-') r = a - b;
        else if (op == '*') r = a * b;
        else r = a / b;
        std::cout << r << '\n';
    }
}
```

```hint
Do the reducing in the constructor (flip signs if the denominator is negative, then divide by `std::gcd`). Then every operator can just build a new `Fraction` and get reduction for free.
```

```hint
`a/b + c/d = (a*d + c*b) / (b*d)`, `a/b * c/d = (a*c)/(b*d)`, `a/b ÷ c/d = (a*d)/(b*c)`. The constructor fixes a negative denominator produced by division.
```

```stdin
1/2 + 1/3
3/4 - 1/4
2/3 * 3/4
1/2 / 1/4
```

```expected
5/6
1/2
1/2
2/1
```

```stdin
1/2 - 1/2
-3/4 / 3/-8
5/10 * -4/6
```

```expected hidden
0/1
2/1
-1/3
```

```checks
must operator\s*>>\s*\( :: Read fractions with an overloaded operator>>.
must operator\s*<<\s*\( :: Print fractions with an overloaded operator<<.
must operator\s*\+\s*\( :: Overload operator+.
must operator\s*\/\s*\( :: Overload operator/.
```
:::

:::exercise Polynomial object
Write a class `Polynomial` holding coefficients `c0, c1, ..., cn` (for `c0 + c1·x + ... + cn·xⁿ`):

- `explicit Polynomial(int degree)` creates `degree + 1` zero coefficients.
- `operator[]` in **two** versions: non-const returning `long long&` (to set coefficients) and `const`
  returning `const long long&` (or a value).
- `long long operator()(long long x) const` evaluates the polynomial at `x`.

`main` fills it with `p[i] = ...` and evaluates through a **const reference** with `poly(x)`.

**Input:** the degree `n`, then `n + 1` coefficients `c0 ... cn`, then a count `m` and `m` values of `x`.
**Output:** `p(x) = V` for each `x`, one per line.

```cpp starter
#include <iostream>
#include <vector>

class Polynomial {
    std::vector<long long> c_;
public:
    explicit Polynomial(int degree) : c_(degree + 1, 0) {}
    int degree() const { return static_cast<int>(c_.size()) - 1; }
    // add operator[] (two versions) and operator()
};

void report(const Polynomial& poly, long long x) {
    // std::cout << "p(" << x << ") = " << poly(x) << '\n';
    (void)poly;
    std::cout << "p(" << x << ") = " << 0 << '\n';
}

int main() {
    int n;
    std::cin >> n;
    Polynomial p(n);
    for (int i = 0; i <= n; ++i) {
        long long c;
        std::cin >> c;
        // p[i] = c;
    }
    int m;
    std::cin >> m;
    for (int i = 0; i < m; ++i) {
        long long x;
        std::cin >> x;
        report(p, x);
    }
}
```

```cpp solution
#include <iostream>
#include <vector>

class Polynomial {
    std::vector<long long> c_;
public:
    explicit Polynomial(int degree) : c_(degree + 1, 0) {}
    int degree() const { return static_cast<int>(c_.size()) - 1; }

    long long& operator[](int i) { return c_[i]; }
    const long long& operator[](int i) const { return c_[i]; }

    long long operator()(long long x) const {
        long long result = 0;
        for (int i = degree(); i >= 0; --i) result = result * x + (*this)[i];   // Horner's rule
        return result;
    }
};

void report(const Polynomial& poly, long long x) {
    std::cout << "p(" << x << ") = " << poly(x) << '\n';
}

int main() {
    int n;
    std::cin >> n;
    Polynomial p(n);
    for (int i = 0; i <= n; ++i) {
        long long c;
        std::cin >> c;
        p[i] = c;
    }
    int m;
    std::cin >> m;
    for (int i = 0; i < m; ++i) {
        long long x;
        std::cin >> x;
        report(p, x);
    }
}
```

```hint
`long long& operator[](int i) { return c_[i]; }` and `const long long& operator[](int i) const { return c_[i]; }`.
```

```hint
Evaluate with Horner's rule: start with `result = 0` and, from the highest coefficient down, do `result = result * x + c_[i]`.
```

```stdin
2
1 0 1
3
0 2 -3
```

```expected
p(0) = 1
p(2) = 5
p(-3) = 10
```

```stdin
0
7
2
100 -100
```

```expected hidden
p(100) = 7
p(-100) = 7
```

```stdin
3
0 -1 0 2
1
3
```

```expected hidden
p(3) = 51
```

```checks
must operator\s*\[\s*\]\s*\([^)]*\)\s*const :: Write a const operator[].
must &\s*operator\s*\[\s*\]\s*\([^)]*\)\s*\{ :: Write a non-const operator[] that returns a reference.
must operator\s*\(\s*\)\s*\( :: Write operator() to evaluate the polynomial.
must poly\s*\(\s*x\s*\) :: Evaluate with poly(x) in report.
```
:::
