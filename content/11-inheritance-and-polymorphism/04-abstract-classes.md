---
title: Abstract Classes & Interfaces
summary: Pure virtual functions, abstract classes that can't be instantiated, interfaces, and storing different derived types together in a std::vector<std::unique_ptr<Base>>.
---

## Functions with no sensible default

In the last lesson, `Shape::area()` returned `0` and `Animal::speak()` printed `...`. Those were made-up
placeholders: what *is* the area of a "shape" in general? There isn't one. What we really want to say is
"every shape **has** an area, but each concrete kind of shape must define how to compute it".

That's a **pure virtual function**. Write `= 0` instead of a body:

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;          // pure virtual: no implementation here
    virtual std::string name() const = 0;
};
```

A class with at least one pure virtual function is an **abstract class**. It's an incomplete type
that exists only to be inherited from. Classes that override every pure virtual function are
**concrete**, and can be instantiated.

```cpp run
#include <iostream>
#include <string>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual std::string name() const = 0;

    void describe() const {                    // abstract classes can have normal members too
        std::cout << name() << " with area " << area() << '\n';
    }
};

class Square : public Shape {
    double side_;
public:
    explicit Square(double s) : side_(s) {}
    double area() const override { return side_ * side_; }
    std::string name() const override { return "square"; }
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159 * r_ * r_; }
    std::string name() const override { return "circle"; }
};

int main() {
    Square s(3);
    Circle c(1);
    s.describe();
    c.describe();

    const Shape& ref = s;      // references and pointers to an abstract class are fine
    std::cout << ref.area() << '\n';
}
```

```output
square with area 9
circle with area 3.14159
9
```

`describe` is written once in the base and calls the pure virtual functions, which dispatch to each
concrete class. The base defines *the algorithm*, derived classes fill in *the steps*.

## Abstract classes can't be instantiated

You can't create an object whose type is abstract, not as a variable, not with `new`, not as a
by-value parameter or return value. It would have functions with no implementation:

```cpp compile-error
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

void byValue(Shape s);           // error: cannot declare parameter 's' to be of abstract type 'Shape'

int main() {
    Shape s;                     // error: cannot declare variable 's' to be of abstract type 'Shape'
    Shape* p = new Shape();      // error: invalid new-expression of abstract class type 'Shape'
}
```

A derived class that doesn't override **all** the pure virtual functions is **still abstract**. The
compiler's error message lists the ones you missed:

```cpp compile-error
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual double perimeter() const = 0;
};

class Square : public Shape {
    double s_ = 1;
public:
    double area() const override { return s_ * s_; }
    // forgot perimeter()
};

int main() {
    Square sq;   // error: cannot declare variable 'sq' to be of abstract type 'Square'
                 // note: because the following virtual functions are pure within 'Square':
                 // note:     'virtual double Shape::perimeter() const'
}
```

That's a feature: the compiler guarantees that every concrete shape implements the whole interface.

### Pure virtual functions *with* a body

Oddly, a pure virtual function can still have a definition (written outside the class). Derived classes
must still override it, but can call the base version explicitly as a shared default. The main real use
is a **pure virtual destructor**, which makes a class abstract when it has no other natural pure
virtual function. It **must** be defined, because derived destructors always call it:

```cpp
class Base {
public:
    virtual ~Base() = 0;      // pure: Base is abstract
};
Base::~Base() = default;      // ...but it still needs a definition
```

## Interfaces

An **interface** is an abstract class with **only** pure virtual functions (plus a virtual destructor)
and no data. It describes a *capability*: what something can do, saying nothing about how. C++ has
no `interface` keyword; this convention is how you write one.

```cpp run
#include <iostream>
#include <string>

class Printable {                         // interface: "can be printed"
public:
    virtual ~Printable() = default;
    virtual std::string toString() const = 0;
};

class Invoice : public Printable {
    int number_;
    double amount_;
public:
    Invoice(int n, double a) : number_(n), amount_(a) {}
    std::string toString() const override {
        return "Invoice #" + std::to_string(number_) + ": $" + std::to_string(static_cast<int>(amount_));
    }
};

class User : public Printable {
    std::string name_;
public:
    explicit User(std::string n) : name_(std::move(n)) {}
    std::string toString() const override { return "User " + name_; }
};

void printAll(const Printable& a, const Printable& b) {   // knows nothing about Invoice or User
    std::cout << a.toString() << '\n' << b.toString() << '\n';
}

int main() {
    Invoice inv(42, 99.5);
    User u("ada");
    printAll(inv, u);
}
```

```output
Invoice #42: $99
User ada
```

Code written against an interface (`printAll`) works with classes that didn't exist when it was
written. This decoupling is the heart of good object-oriented design: depend on **abstractions**,
not concrete types. A class can implement several interfaces at once, which the "Multiple & Virtual
Inheritance" lesson covers.

## Polymorphic containers

The payoff of polymorphism is handling a **collection of different derived types** uniformly. But a
`std::vector<Shape>` can't work: `Shape` is abstract, and even if it weren't, each element would be just
a `Shape`-sized slot, too small for a `Circle` (more on that in "Object Slicing"). You need to store
**pointers**. Which pointers? Ones that **own** the objects, so they're deleted automatically:
`std::unique_ptr`.

```cpp run
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual std::string name() const = 0;
};

class Rect : public Shape {
    double w_, h_;
public:
    Rect(double w, double h) : w_(w), h_(h) {}
    double area() const override { return w_ * h_; }
    std::string name() const override { return "rect"; }
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159 * r_ * r_; }
    std::string name() const override { return "circle"; }
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Rect>(2, 3));       // unique_ptr<Rect> converts to unique_ptr<Shape>
    shapes.push_back(std::make_unique<Circle>(1));
    shapes.push_back(std::make_unique<Rect>(10, 0.5));

    double total = 0;
    for (const auto& s : shapes) {                         // const auto&: unique_ptr can't be copied
        std::cout << s->name() << ": " << s->area() << '\n';
        total += s->area();
    }
    std::cout << "total: " << total << '\n';
}                                                          // vector destroyed -> every shape deleted
```

```output
rect: 6
circle: 3.14159
rect: 5
total: 14.1416
```

Why `std::unique_ptr` and not raw `Shape*`?

- With `std::vector<Shape*>` and `new`, *you* must remember to `delete` every element, on every path,
  including exceptions. Easy to leak.
- `std::unique_ptr` deletes its object automatically (RAII), and the vector of them is still movable.
- Raw pointers are fine for **non-owning** views of objects that live elsewhere (like the
  `Animal* zoo[] = {&d, &c}` example earlier).

> **Note:** Deleting a `Circle` through a `std::unique_ptr<Shape>` is only correct because `Shape` has a
> **virtual destructor**. The next lesson explains why that line is essential.

### Factory functions

The code that creates objects often decides the concrete type at run time (from user input or a file).
A **factory function** hides the `if`s and returns the base pointer:

```cpp
std::unique_ptr<Shape> makeShape(const std::string& kind, double a, double b) {
    if (kind == "rect") return std::make_unique<Rect>(a, b);
    if (kind == "circle") return std::make_unique<Circle>(a);
    return nullptr;                                     // unknown kind
}
```

Everything after creation works through the `Shape` interface, so adding a new shape means writing the
class and one line in the factory, without touching any other code.

:::quiz
Which of these makes a class abstract?

- [ ] Having a `virtual` function
- [x] Having at least one pure virtual function (`= 0`) that isn't overridden
- [ ] Having a protected constructor
- [ ] Having no data members

A class is abstract if it declares or inherits a pure virtual function without a final overrider.
:::

:::quiz
`Shape` is abstract. Which declarations compile? (select all that apply)

- [ ] `Shape s;`
- [x] `Shape* p = nullptr;`
- [x] `void draw(const Shape& s);`
- [x] `std::vector<std::unique_ptr<Shape>> v;`
- [ ] `std::vector<Shape> v; v.emplace_back();`

You can have pointers and references to an abstract type, but never an object of it.
:::

:::exercise Shape table
Make `Shape` abstract with **pure virtual** `area()` and `name()`, and write three concrete shapes:

- `Circle(r)`: area `π·r²` (use `3.14159265358979`), name `circle`
- `Rect(w, h)`: area `w·h`, name `rect`
- `Triangle(b, h)`: area `b·h/2`, name `triangle`

Store them in a `std::vector<std::unique_ptr<Shape>>`.

**Input:** `n`, then `n` lines: `circle R`, `rect W H`, or `triangle B H`.
**Output:** `NAME: AREA` for each shape in input order, then `total: T`, all with 2 decimal places.

```cpp starter
#include <iomanip>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    // pure virtual area() and name()
};

// Circle, Rect, Triangle

int main() {
    int n;
    std::cin >> n;
    std::vector<std::unique_ptr<Shape>> shapes;
    for (int i = 0; i < n; ++i) {
        std::string kind;
        std::cin >> kind;
        double a = 0, b = 0;
        std::cin >> a;
        if (kind != "circle") std::cin >> b;
        // shapes.push_back(std::make_unique<...>(...));
    }
    std::cout << std::fixed << std::setprecision(2);
    double total = 0;
    // print each shape and add up the total
    std::cout << "total: " << total << '\n';
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual std::string name() const = 0;
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159265358979 * r_ * r_; }
    std::string name() const override { return "circle"; }
};

class Rect : public Shape {
    double w_, h_;
public:
    Rect(double w, double h) : w_(w), h_(h) {}
    double area() const override { return w_ * h_; }
    std::string name() const override { return "rect"; }
};

class Triangle : public Shape {
    double b_, h_;
public:
    Triangle(double b, double h) : b_(b), h_(h) {}
    double area() const override { return b_ * h_ / 2; }
    std::string name() const override { return "triangle"; }
};

int main() {
    int n;
    std::cin >> n;
    std::vector<std::unique_ptr<Shape>> shapes;
    for (int i = 0; i < n; ++i) {
        std::string kind;
        std::cin >> kind;
        double a = 0, b = 0;
        std::cin >> a;
        if (kind != "circle") std::cin >> b;
        if (kind == "circle") shapes.push_back(std::make_unique<Circle>(a));
        else if (kind == "rect") shapes.push_back(std::make_unique<Rect>(a, b));
        else shapes.push_back(std::make_unique<Triangle>(a, b));
    }
    std::cout << std::fixed << std::setprecision(2);
    double total = 0;
    for (const auto& s : shapes) {
        std::cout << s->name() << ": " << s->area() << '\n';
        total += s->area();
    }
    std::cout << "total: " << total << '\n';
}
```

```hint
`virtual double area() const = 0;` and `virtual std::string name() const = 0;` in `Shape`.
```

```hint
Add elements with `shapes.push_back(std::make_unique<Circle>(a));`, and loop with `for (const auto& s : shapes)`, using `s->area()`.
```

```stdin
3
circle 1
rect 2 3
triangle 4 5
```

```expected
circle: 3.14
rect: 6.00
triangle: 10.00
total: 19.14
```

```stdin
0
```

```expected hidden
total: 0.00
```

```checks
must virtual\s+double\s+area\s*\(\s*\)\s*const\s*=\s*0 :: Make area() pure virtual.
must std::vector\s*<\s*std::unique_ptr\s*<\s*Shape\s*>\s*> :: Store the shapes in a vector of unique_ptr<Shape>.
must class\s+Triangle\s*:\s*public\s+Shape :: Write a Triangle class derived from Shape.
```
:::

:::exercise Command machine
Build a tiny interpreter. `Command` is an abstract class with one pure virtual function
`void apply(long long& acc) const`. Write three commands:

- `Add(n)`: adds `n` to the accumulator,
- `Mul(n)`: multiplies the accumulator by `n`,
- `Neg`: negates the accumulator.

Write a factory `std::unique_ptr<Command> parse(const std::string& op, std::istream& in)` that reads the
argument (for `add` and `mul`) from `in` and returns the right command. `main` builds the whole program
first, then runs it.

**Input:** a starting value, then commands until end of input: `add N`, `mul N`, or `neg`.
**Output:** the accumulator after each command, one per line. If there are no commands, print nothing.

```cpp starter
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Command {
public:
    virtual ~Command() = default;
    // pure virtual apply
};

std::unique_ptr<Command> parse(const std::string& op, std::istream& in) {
    (void)op;
    (void)in;
    return nullptr;
}

int main() {
    long long acc;
    std::cin >> acc;
    std::vector<std::unique_ptr<Command>> program;
    std::string op;
    while (std::cin >> op) program.push_back(parse(op, std::cin));
    for (const auto& cmd : program) {
        if (cmd) {
            // cmd->apply(acc);
        }
        std::cout << acc << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Command {
public:
    virtual ~Command() = default;
    virtual void apply(long long& acc) const = 0;
};

class Add : public Command {
    long long n_;
public:
    explicit Add(long long n) : n_(n) {}
    void apply(long long& acc) const override { acc += n_; }
};

class Mul : public Command {
    long long n_;
public:
    explicit Mul(long long n) : n_(n) {}
    void apply(long long& acc) const override { acc *= n_; }
};

class Neg : public Command {
public:
    void apply(long long& acc) const override { acc = -acc; }
};

std::unique_ptr<Command> parse(const std::string& op, std::istream& in) {
    if (op == "neg") return std::make_unique<Neg>();
    long long n = 0;
    in >> n;
    if (op == "add") return std::make_unique<Add>(n);
    if (op == "mul") return std::make_unique<Mul>(n);
    return nullptr;
}

int main() {
    long long acc;
    std::cin >> acc;
    std::vector<std::unique_ptr<Command>> program;
    std::string op;
    while (std::cin >> op) program.push_back(parse(op, std::cin));
    for (const auto& cmd : program) {
        if (cmd) {
            cmd->apply(acc);
        }
        std::cout << acc << '\n';
    }
}
```

```hint
`virtual void apply(long long& acc) const = 0;` in `Command`, and one small class per command overriding it.
```

```hint
In `parse`, handle `neg` first (it has no argument). For the others, read `long long n; in >> n;` and return `std::make_unique<Add>(n)` or `std::make_unique<Mul>(n)`.
```

```stdin
10
add 5
mul 3
neg
add 100
```

```expected
15
45
-45
55
```

```stdin
7
```

```expected hidden
```

```stdin
-2
neg
neg
mul 0
```

```expected hidden
2
-2
0
```

```checks
must virtual\s+void\s+apply\s*\([^)]*\)\s*const\s*=\s*0 :: Make apply a pure virtual function.
must std::unique_ptr\s*<\s*Command\s*>\s+parse :: Write the factory returning std::unique_ptr<Command>.
must make_unique\s*<\s*Neg\s*> :: Create commands with std::make_unique.
```
:::

:::exercise Payslips
Use the **template method** pattern: the abstract base `Worker` has a **non-virtual** `printPayslip()`
that calls two **pure virtual** functions, `title()` and `monthlyPay()`. Write three concrete workers:

- `Salaried(name, annual)`: title `salaried`, pay `annual / 12` (integer division)
- `Hourly(name, hours, rate)`: title `hourly`, pay `hours * rate`
- `Commissioned(name, base, sales)`: title `commission`, pay `base + sales / 10` (integer division)

**Input:** lines until end of input: `salaried NAME ANNUAL`, `hourly NAME HOURS RATE`, or `commission NAME BASE SALES`.
**Output:** one payslip line per worker, `TITLE NAME: PAY` (printed by `printPayslip`), then `total: T`.

```cpp starter
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Worker {
    std::string name_;
public:
    explicit Worker(std::string name) : name_(std::move(name)) {}
    virtual ~Worker() = default;
    const std::string& name() const { return name_; }

    // add pure virtual title() and monthlyPay()

    void printPayslip() const {
        // print "TITLE NAME: PAY" using title() and monthlyPay()
    }
};

int main() {
    std::vector<std::unique_ptr<Worker>> staff;
    std::string kind, name;
    while (std::cin >> kind >> name) {
        long long a, b = 0;
        std::cin >> a;
        if (kind != "salaried") std::cin >> b;
        // create the right worker
    }
    long long total = 0;
    for (const auto& w : staff) {
        w->printPayslip();
        // total += w->monthlyPay();
    }
    std::cout << "total: " << total << '\n';
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Worker {
    std::string name_;
public:
    explicit Worker(std::string name) : name_(std::move(name)) {}
    virtual ~Worker() = default;
    const std::string& name() const { return name_; }

    virtual std::string title() const = 0;
    virtual long long monthlyPay() const = 0;

    void printPayslip() const {
        std::cout << title() << ' ' << name() << ": " << monthlyPay() << '\n';
    }
};

class Salaried : public Worker {
    long long annual_;
public:
    Salaried(std::string name, long long annual) : Worker(std::move(name)), annual_(annual) {}
    std::string title() const override { return "salaried"; }
    long long monthlyPay() const override { return annual_ / 12; }
};

class Hourly : public Worker {
    long long hours_, rate_;
public:
    Hourly(std::string name, long long hours, long long rate)
        : Worker(std::move(name)), hours_(hours), rate_(rate) {}
    std::string title() const override { return "hourly"; }
    long long monthlyPay() const override { return hours_ * rate_; }
};

class Commissioned : public Worker {
    long long base_, sales_;
public:
    Commissioned(std::string name, long long base, long long sales)
        : Worker(std::move(name)), base_(base), sales_(sales) {}
    std::string title() const override { return "commission"; }
    long long monthlyPay() const override { return base_ + sales_ / 10; }
};

int main() {
    std::vector<std::unique_ptr<Worker>> staff;
    std::string kind, name;
    while (std::cin >> kind >> name) {
        long long a, b = 0;
        std::cin >> a;
        if (kind != "salaried") std::cin >> b;
        if (kind == "salaried") staff.push_back(std::make_unique<Salaried>(name, a));
        else if (kind == "hourly") staff.push_back(std::make_unique<Hourly>(name, a, b));
        else staff.push_back(std::make_unique<Commissioned>(name, a, b));
    }
    long long total = 0;
    for (const auto& w : staff) {
        w->printPayslip();
        total += w->monthlyPay();
    }
    std::cout << "total: " << total << '\n';
}
```

```hint
The base declares `virtual std::string title() const = 0;` and `virtual long long monthlyPay() const = 0;`, and `printPayslip` just calls them.
```

```hint
Each derived constructor passes the name up: `Salaried(std::string name, long long annual) : Worker(std::move(name)), annual_(annual) {}`.
```

```stdin
salaried Ann 60000
hourly Bob 160 25
commission Cy 2000 15005
```

```expected
salaried Ann: 5000
hourly Bob: 4000
commission Cy: 3500
total: 12500
```

```stdin
hourly Zed 0 100
salaried Max 11
```

```expected hidden
hourly Zed: 0
salaried Max: 0
total: 0
```

```checks
must virtual\s+long\s+long\s+monthlyPay\s*\(\s*\)\s*const\s*=\s*0 :: Make monthlyPay pure virtual.
must virtual\s+std::string\s+title\s*\(\s*\)\s*const\s*=\s*0 :: Make title pure virtual.
mustnot virtual\s+void\s+printPayslip :: Keep printPayslip non-virtual: it's the fixed template.
```
:::
