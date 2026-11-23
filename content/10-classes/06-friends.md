---
title: Friends
summary: Friend functions and friend classes, which can see a class's private members, and when granting that access is the right call.
---

## Granting access to a non-member

`private` members are visible only to the class's own member functions. Occasionally a function that
**isn't a member** needs to see them, typically because it works on two objects symmetrically, or
because its first parameter can't be your class (like `std::ostream& operator<<(std::ostream&, const T&)`,
coming up in the next lesson).

A class can name such a function as a **friend**. A friend function is an ordinary free function that
is allowed to access the class's private and protected members.

```cpp run
#include <iostream>
#include <cmath>

class Point {
private:
    double x_, y_;

public:
    Point(double x, double y) : x_(x), y_(y) {}

    // Declare a friend: "this free function may access my private members"
    friend double distance(const Point& a, const Point& b);
};

// Defined like any free function: no Point::, no 'friend' keyword here
double distance(const Point& a, const Point& b) {
    double dx = a.x_ - b.x_;          // OK: distance is a friend of Point
    double dy = a.y_ - b.y_;
    return std::sqrt(dx * dx + dy * dy);
}

int main() {
    Point p(0, 0), q(3, 4);
    std::cout << distance(p, q) << '\n';   // called like a normal function, not p.distance(q)
}
```

```output
5
```

Things to notice:

- The `friend` declaration goes **inside** the class. It doesn't matter whether it's in the `public`,
  `private`, or `protected` section: access labels don't apply to friend declarations.
- A friend is **not a member**: it has no `this`, and you call it as `distance(p, q)`, not `p.distance(q)`.
- The class decides who its friends are. A function can't declare *itself* a friend of a class it
  doesn't own, which is why friendship doesn't break encapsulation the way public data does.

### Defining a friend inside the class ("hidden friends")

You can also write the friend's whole body inside the class. It's still a non-member function:

```cpp run
#include <iostream>

class Money {
    long long cents_;
public:
    explicit Money(long long cents) : cents_(cents) {}

    friend bool sameAmount(const Money& a, const Money& b) {   // defined in place
        return a.cents_ == b.cents_;
    }
};

int main() {
    Money a(500), b(500), c(10);
    std::cout << std::boolalpha << sameAmount(a, b) << ' ' << sameAmount(a, c) << '\n';
}
```

```output
true false
```

A friend defined inside the class is called a **hidden friend**: it can only be found through
**argument-dependent lookup** (when at least one argument is a `Money`). That keeps it out of the way
of unrelated code and is the recommended style for operators like `==` and `<<`.

## A function that is a friend of two classes

A common case for friendship: one operation needs the private data of **two different classes**. It
can't be a member of both, so it's a friend of both. Since each class mentions the other, you need a
**forward declaration** (`class Vec;`) so the first class knows the second's name exists:

```cpp run
#include <iostream>

class Vec;                  // forward declaration: "a class named Vec exists"

class Matrix {
    double m_[2][2];
public:
    Matrix(double a, double b, double c, double d) : m_{{a, b}, {c, d}} {}
    friend Vec multiply(const Matrix& m, const Vec& v);
};

class Vec {
    double x_, y_;
public:
    Vec(double x, double y) : x_(x), y_(y) {}
    void print() const { std::cout << '(' << x_ << ", " << y_ << ")\n"; }
    friend Vec multiply(const Matrix& m, const Vec& v);
};

Vec multiply(const Matrix& m, const Vec& v) {      // friend of both: sees m.m_ and v.x_
    return Vec(m.m_[0][0] * v.x_ + m.m_[0][1] * v.y_,
               m.m_[1][0] * v.x_ + m.m_[1][1] * v.y_);
}

int main() {
    Matrix rotate90(0, -1, 1, 0);
    multiply(rotate90, Vec(1, 2)).print();
}
```

```output
(-2, 1)
```

## Friend classes

A class can make **another class** its friend. Then **every** member function of the friend class can
access its private members:

```cpp run
#include <iostream>
#include <string>

class Engine {
private:
    int temperature_ = 90;
    std::string serial_ = "EN-4471";

    friend class Mechanic;        // all of Mechanic's members may look inside
};

class Mechanic {
public:
    void inspect(const Engine& e) const {
        std::cout << "serial " << e.serial_ << ", temp " << e.temperature_ << '\n';
    }
    void coolDown(Engine& e) const { e.temperature_ -= 30; }
};

int main() {
    Engine e;
    Mechanic m;
    m.inspect(e);
    m.coolDown(e);
    m.inspect(e);
}
```

```output
serial EN-4471, temp 90
serial EN-4471, temp 60
```

You can also befriend **just one member function** of another class, but that other class must be
fully defined first:

```cpp
class Engine;

class Mechanic {
public:
    void inspect(const Engine& e) const;   // declared here, defined after Engine
};

class Engine {
    int temperature_ = 90;
    friend void Mechanic::inspect(const Engine&) const;   // only this one function
};

void Mechanic::inspect(const Engine& e) const { /* can read e.temperature_ */ }
```

## The rules of friendship

Friendship is deliberately limited:

- **Not mutual.** If `A` declares `friend class B;`, `B` can see `A`'s privates, but `A` can't see `B`'s.
- **Not transitive.** A friend of your friend is not your friend.
- **Not inherited.** If `B` is a friend of `A`, classes derived from `B` are not friends of `A` (and
  friends of a base class have no special access to derived classes).

```cpp compile-error
class A {
    int secret_ = 1;
    friend class B;
};

class B {
    int hidden_ = 2;
public:
    int peek(const A& a) const { return a.secret_; }   // OK: B is A's friend
};

int peekB(const B& b) {
    return b.hidden_;    // error: 'int B::hidden_' is private (A is not B's friend, and this is a free function anyway)
}

int main() {}
```

## When is friendship appropriate?

Friendship is a tool for **tightly coupled code that is logically part of the class's interface**. Good uses:

- **Operators** where the left operand isn't your class (`operator<<`, `operator>>`) or that should be
  symmetric (`a + b` with conversions on either side, `a == b`). You'll see these in the next lesson.
- **Two classes designed together**, like a container and its iterator, or `Matrix` and `Vec` above.
- **Factories or builders** that need to call a private constructor.

Warning signs that you're overusing it:

- You befriend a class just to avoid writing a public member function that would be fine to have.
- Many unrelated classes are friends of one class. At that point the private data isn't private.

> **Tip:** Friendship can actually *improve* encapsulation. The alternative to one friend function is
> often adding public getters for every private field, which exposes them to *everyone*. A friend
> exposes them to exactly one, carefully chosen function.

:::quiz
Class `A` contains `friend class B;`. Which statements are true? (select all that apply)

- [x] Member functions of `B` can access `A`'s private members
- [ ] Member functions of `A` can access `B`'s private members
- [ ] A class `C` derived from `B` can access `A`'s private members
- [ ] Friends of `B` can access `A`'s private members

Friendship is one-way, not inherited, and not transitive.
:::

:::quiz
`friend void show(const Widget& w);` is declared inside `Widget`. How do you call it?

- [ ] `w.show();`
- [x] `show(w);`
- [ ] `Widget::show(w);`
- [ ] `friend show(w);`

A friend function is not a member, so it's called like any free function.
:::

:::exercise Friendly distance
`Point` keeps its coordinates private and has **no getters**. Write a **friend** function
`double distance(const Point& a, const Point& b)` that returns the Euclidean distance between two points.

**Input:** four numbers `x1 y1 x2 y2`.
**Output:** the distance with exactly 2 decimal places.

```cpp starter
#include <iostream>
#include <iomanip>
#include <cmath>

class Point {
    double x_, y_;
public:
    Point(double x, double y) : x_(x), y_(y) {}
    // declare the friend here
};

// define distance here

int main() {
    double x1, y1, x2, y2;
    std::cin >> x1 >> y1 >> x2 >> y2;
    Point a(x1, y1), b(x2, y2);
    std::cout << std::fixed << std::setprecision(2) << 0.0 << '\n';   // print distance(a, b)
}
```

```cpp solution
#include <iostream>
#include <iomanip>
#include <cmath>

class Point {
    double x_, y_;
public:
    Point(double x, double y) : x_(x), y_(y) {}
    friend double distance(const Point& a, const Point& b);
};

double distance(const Point& a, const Point& b) {
    double dx = a.x_ - b.x_;
    double dy = a.y_ - b.y_;
    return std::sqrt(dx * dx + dy * dy);
}

int main() {
    double x1, y1, x2, y2;
    std::cin >> x1 >> y1 >> x2 >> y2;
    Point a(x1, y1), b(x2, y2);
    std::cout << std::fixed << std::setprecision(2) << distance(a, b) << '\n';
}
```

```hint
Inside the class: `friend double distance(const Point& a, const Point& b);`
```

```hint
Use `std::sqrt(dx * dx + dy * dy)` from `<cmath>`.
```

```stdin
0 0 3 4
```

```expected
5.00
```

```stdin
1.5 -2 1.5 -2
```

```expected hidden
0.00
```

```stdin
-1 -1 2 3
```

```expected hidden
5.00
```

```checks
must friend\s+double\s+distance :: Declare distance as a friend of Point.
mustnot double\s+get|double\s+x\s*\(\s*\) :: Don't add getters; use friendship instead.
must distance\s*\(\s*a\s*,\s*b\s*\) :: Call distance(a, b) in main.
```
:::

:::exercise Vault auditor
`Vault` keeps its balance and transaction count private. Make class `Auditor` a **friend class** of
`Vault`, and implement `Auditor::report`, which prints:

```
transactions: T
balance: B
```

`deposit` (already written) adds to the balance and counts one transaction for each **positive**
amount; other amounts are ignored.

**Input:** a count `n`, then `n` integers to deposit.
**Output:** the auditor's report.

```cpp starter
#include <iostream>

class Vault {
    long long balance_ = 0;
    int transactions_ = 0;
public:
    void deposit(long long amount) {
        if (amount > 0) {
            balance_ += amount;
            ++transactions_;
        }
    }
};

class Auditor {
public:
    void report(const Vault&) const {
        // print the report using the vault's private members
    }
};

int main() {
    int n;
    std::cin >> n;
    Vault v;
    for (int i = 0; i < n; ++i) {
        long long amount;
        std::cin >> amount;
        v.deposit(amount);
    }
    Auditor().report(v);
}
```

```cpp solution
#include <iostream>

class Vault {
    long long balance_ = 0;
    int transactions_ = 0;
    friend class Auditor;
public:
    void deposit(long long amount) {
        if (amount > 0) {
            balance_ += amount;
            ++transactions_;
        }
    }
};

class Auditor {
public:
    void report(const Vault& v) const {
        std::cout << "transactions: " << v.transactions_ << '\n';
        std::cout << "balance: " << v.balance_ << '\n';
    }
};

int main() {
    int n;
    std::cin >> n;
    Vault v;
    for (int i = 0; i < n; ++i) {
        long long amount;
        std::cin >> amount;
        v.deposit(amount);
    }
    Auditor().report(v);
}
```

```hint
Add `friend class Auditor;` anywhere inside `Vault`.
```

```stdin
3
100 250 50
```

```expected
transactions: 3
balance: 400
```

```stdin
4
-5 0 10 -20
```

```expected hidden
transactions: 1
balance: 10
```

```checks
must friend\s+class\s+Auditor :: Make Auditor a friend class of Vault.
```
:::

:::exercise Matrix times vector
Write a function `Vec multiply(const Matrix& m, const Vec& v)` that multiplies a 2×2 matrix by a
2-element vector. Both classes keep their data private, so the function must be a **friend of both**.
(You'll need a forward declaration.)

For matrix `[[a, b], [c, d]]` and vector `(x, y)` the result is `(a*x + b*y, c*x + d*y)`.

**Input:** six integers `a b c d x y`.
**Output:** the result as `(X, Y)`.

```cpp starter
#include <iostream>

class Matrix {
    long long a_, b_, c_, d_;
public:
    Matrix(long long a, long long b, long long c, long long d) : a_(a), b_(b), c_(c), d_(d) {}
};

class Vec {
    long long x_, y_;
public:
    Vec(long long x, long long y) : x_(x), y_(y) {}
    void print() const { std::cout << '(' << x_ << ", " << y_ << ")\n"; }
};

int main() {
    long long a, b, c, d, x, y;
    std::cin >> a >> b >> c >> d >> x >> y;
    Matrix m(a, b, c, d);
    Vec v(x, y);
    v.print();   // print multiply(m, v) instead
}
```

```cpp solution
#include <iostream>

class Vec;

class Matrix {
    long long a_, b_, c_, d_;
public:
    Matrix(long long a, long long b, long long c, long long d) : a_(a), b_(b), c_(c), d_(d) {}
    friend Vec multiply(const Matrix& m, const Vec& v);
};

class Vec {
    long long x_, y_;
public:
    Vec(long long x, long long y) : x_(x), y_(y) {}
    void print() const { std::cout << '(' << x_ << ", " << y_ << ")\n"; }
    friend Vec multiply(const Matrix& m, const Vec& v);
};

Vec multiply(const Matrix& m, const Vec& v) {
    return Vec(m.a_ * v.x_ + m.b_ * v.y_, m.c_ * v.x_ + m.d_ * v.y_);
}

int main() {
    long long a, b, c, d, x, y;
    std::cin >> a >> b >> c >> d >> x >> y;
    Matrix m(a, b, c, d);
    Vec v(x, y);
    multiply(m, v).print();
}
```

```hint
Put `class Vec;` above `Matrix` so `Matrix` can mention `Vec` in its friend declaration.
```

```hint
Both classes need the same line: `friend Vec multiply(const Matrix& m, const Vec& v);`. Define the function after both classes.
```

```stdin
1 2 3 4 5 6
```

```expected
(17, 39)
```

```stdin
0 -1 1 0 1 0
```

```expected hidden
(0, 1)
```

```stdin
7 7 7 7 0 0
```

```expected hidden
(0, 0)
```

```checks
must friend[\s\S]*friend :: multiply must be declared a friend in both classes.
must class\s+Vec\s*; :: Forward-declare Vec.
```
:::
