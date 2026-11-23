---
title: Virtual Functions
summary: Static vs dynamic binding, virtual functions called through base pointers and references, override and final, how vtables work, and calling the base version.
---

## The problem: calls follow the declared type

At the end of the Inheritance Basics lesson, calling `speak()` through an `Animal&` that referred to a
`Dog` ran `Animal::speak`, not `Dog::speak`. By default, C++ decides which function to call **at
compile time**, from the **static type** of the expression (the type it was *declared* as). This is
**static binding**.

```cpp run
#include <iostream>

class Animal {
public:
    void speak() const { std::cout << "...\n"; }      // NOT virtual
};

class Dog : public Animal {
public:
    void speak() const { std::cout << "Woof\n"; }
};

int main() {
    Dog d;
    Animal& ref = d;          // static type Animal&, dynamic (real) type Dog
    Animal* ptr = &d;
    ref.speak();              // Animal::speak
    ptr->speak();             // Animal::speak
}
```

```output
...
...
```

That defeats the purpose of having different kinds of animals. We want code like
`for (Animal* a : zoo) a->speak();` to do the right thing for each animal, without knowing their
concrete types. That's **polymorphism** ("many forms"): one interface, many behaviors.

## `virtual`: dynamic binding

Mark the base class function **`virtual`**. Now a call through a base **pointer or reference** is
resolved **at run time**, based on the **dynamic type**: the actual type of the object. This is
**dynamic binding** (or *dynamic dispatch*).

```cpp run
#include <iostream>
#include <string>

class Animal {
public:
    virtual ~Animal() = default;                       // explained in "Virtual Destructors"
    virtual void speak() const { std::cout << "...\n"; }
    virtual std::string kind() const { return "animal"; }
};

class Dog : public Animal {
public:
    void speak() const override { std::cout << "Woof\n"; }
    std::string kind() const override { return "dog"; }
};

class Cat : public Animal {
public:
    void speak() const override { std::cout << "Meow\n"; }
    // kind() not overridden: Animal's version is used
};

void introduce(const Animal& a) {          // works with ANY Animal
    std::cout << "This " << a.kind() << " says: ";
    a.speak();
}

int main() {
    Dog d;
    Cat c;
    Animal generic;
    introduce(d);
    introduce(c);
    introduce(generic);

    Animal* zoo[] = {&d, &c, &generic};
    for (const Animal* a : zoo) a->speak();
}
```

```output
This dog says: Woof
This animal says: Meow
This animal says: ...
Woof
Meow
...
```

`introduce` was compiled once, knowing only `Animal`, yet it calls the right `speak` for each object,
including types written long after `introduce`. That's the power of polymorphism: code written against
the base class works with every derived class.

Key rules:

- `virtual` is needed only in the **base** declaration. Once virtual, a function stays virtual in all
  derived classes (writing `virtual` again there is allowed but redundant).
- A derived function **overrides** the base one only if the signature matches exactly: same name, same
  parameter types, same `const`-ness, same ref-qualifiers. (The return type must match too, except
  for covariant returns, below.)
- Dynamic binding happens **only through pointers and references**. Calling on an object directly
  (`d.speak()`) or on a copy uses its static type, which then *is* the dynamic type.
- If the derived class doesn't override a virtual function, the base version is inherited (`Cat::kind`).

## `override`: always use it

Without `override`, a tiny signature mismatch silently creates a **new, unrelated function** instead of
an override. Everything compiles, and the base version keeps getting called:

```cpp run warns
#include <iostream>

class Base {
public:
    virtual ~Base() = default;
    virtual void show() const { std::cout << "Base::show\n"; }
};

class Derived : public Base {
public:
    void show() { std::cout << "Derived::show\n"; }    // forgot const: does NOT override
};

int main() {
    Derived d;
    const Base& b = d;
    b.show();       // Base::show !
}
```

```output
Base::show
```

Recent GCC versions happen to warn here (`'virtual void Base::show() const' was hidden`), but a warning
is easy to miss and not every compiler or situation produces one.

Write **`override`** after the parameter list (and after `const`) on every overriding function. It asks
the compiler to *check* that it really overrides something, turning the silent bug into an error:

```cpp compile-error
class Base {
public:
    virtual ~Base() = default;
    virtual void show() const {}
    virtual void resize(double factor) {}
};

class Derived : public Base {
public:
    void show() override {}               // error: 'void Derived::show()' marked 'override', but does not override
    void resize(int factor) override {}   // error: wrong parameter type
    void shwo() const override {}         // error: typo in the name
};

int main() {}
```

> **Tip:** The modern convention is: `virtual` on the base declaration only, `override` on every
> override (and not `virtual` together with `override`, which is redundant).

## `final`

`final` stops further overriding or inheriting:

- On a **virtual function**: no class derived from this one may override it further.
- On a **class**: nobody may inherit from it at all.

```cpp compile-error
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const { return 0; }
    virtual void draw() const {}
};

class Circle : public Shape {
public:
    double area() const final { return 3.14; }      // can't be overridden below Circle
    void draw() const override {}
};

class Ring : public Circle {
public:
    double area() const override { return 1.0; }    // error: overriding final function
};

class Point final : public Shape {};                 // a final class

class BigPoint : public Point {};                    // error: cannot derive from 'final' base

int main() {}
```

Use `final` when a class is not designed to be extended, or when a further override would break
invariants. It also lets the compiler **devirtualize** calls (turn them back into cheap direct calls)
because it knows no further override can exist.

## How it works: vtables (conceptually)

The standard doesn't say how virtual calls are implemented, but every major compiler does it the same way:

- Each class with virtual functions gets one **vtable** (virtual table): an array of pointers to the
  class's versions of each virtual function, created by the compiler.
- Each **object** of such a class contains a hidden pointer, the **vptr**, set by the constructor to
  point at its class's vtable.
- A virtual call `p->speak()` becomes: follow `p` to the object, read its vptr, look up the `speak`
  slot in the vtable, and call whatever is there.

```
 Dog object             Dog's vtable                Cat object             Cat's vtable
 ┌──────────┐          ┌───────────────────┐        ┌──────────┐          ┌───────────────────┐
 │ vptr ────┼────────► │ ~Dog              │        │ vptr ────┼────────► │ ~Cat              │
 │ ...data  │          │ Dog::speak        │        │ ...data  │          │ Cat::speak        │
 └──────────┘          │ Dog::kind         │        └──────────┘          │ Animal::kind      │
                       └───────────────────┘                              └───────────────────┘
```

The costs are small but real: an extra pointer in every object, one indirect call (which usually can't
be inlined), and a vtable per class. That's why C++ doesn't make functions virtual by default: you pay
only when you ask for it.

```cpp run
#include <iostream>

struct Plain { int x; void f() {} };
struct Poly  { int x; virtual void f() {} virtual ~Poly() = default; };

int main() {
    std::cout << std::boolalpha << (sizeof(Poly) > sizeof(Plain)) << '\n';   // the hidden vptr
}
```

```output
true
```

## Calling the base version: `Base::f()`

An override often wants to **extend** the base behavior. Qualify the call with the base class name to
call that exact version, skipping dynamic dispatch:

```cpp run
#include <iostream>

class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const char* msg) const { std::cout << "[log] " << msg << '\n'; }
};

class TimestampLogger : public Logger {
public:
    void log(const char* msg) const override {
        std::cout << "12:00 ";
        Logger::log(msg);              // reuse the base implementation
    }
};

int main() {
    TimestampLogger t;
    const Logger& l = t;
    l.log("started");
}
```

```output
12:00 [log] started
```

Forgetting the `Logger::` qualification would call `TimestampLogger::log` again, recursing forever.

## Virtual functions in constructors and destructors

Inside a **constructor or destructor**, virtual calls do **not** reach the derived class. While `Base`'s
constructor runs, the `Derived` part doesn't exist yet (its members aren't initialized), so the object
is treated as a plain `Base`:

```cpp run
#include <iostream>

class Base {
public:
    Base() { hello(); }                       // calls Base::hello, even when building a Derived
    virtual ~Base() = default;
    virtual void hello() const { std::cout << "Base::hello\n"; }
};

class Derived : public Base {
public:
    Derived() { hello(); }
    void hello() const override { std::cout << "Derived::hello\n"; }
};

int main() {
    Derived d;
}
```

```output
Base::hello
Derived::hello
```

## Two more details

**Default arguments are bound statically.** A default argument comes from the declaration the compiler
sees (the static type), while the function body comes from the dynamic type. Mixing them gives
confusing results, so don't give overrides different default arguments (or avoid defaults on virtuals).

```cpp run
#include <iostream>
#include <string>

struct Base {
    virtual ~Base() = default;
    virtual void greet(const std::string& who = "from Base") const { std::cout << "Base " << who << '\n'; }
};

struct Derived : Base {
    void greet(const std::string& who = "from Derived") const override { std::cout << "Derived " << who << '\n'; }
};

int main() {
    Derived d;
    const Base& b = d;
    b.greet();   // Derived's body, Base's default argument!
}
```

```output
Derived from Base
```

**Covariant return types.** An override may return a pointer or reference to a *more derived* class
than the base version does. That's the one exception to "return types must match":

```cpp
struct Shape  { virtual Shape*  clone() const; virtual ~Shape() = default; };
struct Circle : Shape { Circle* clone() const override; };   // OK: Circle* is covariant with Shape*
```

:::quiz
What does this print?

```cpp
struct A { virtual void f() const { std::cout << "A"; } virtual ~A() = default; };
struct B : A { void f() const override { std::cout << "B"; } };
int main() {
    B b;
    A a = b;      // a copy
    A& r = b;
    a.f();
    r.f();
}
```

- [ ] `BB`
- [x] `AB`
- [ ] `AA`
- [ ] `BA`

`a` is a separate `A` object (a copy of `b`'s `A` part), so `a.f()` calls `A::f`. `r` refers to the
real `B`, so dynamic binding calls `B::f`.
:::

:::quiz
What's the main benefit of writing `override`?

- [ ] It makes the function virtual
- [ ] It makes the call faster
- [x] The compiler reports an error if the function doesn't actually override a base virtual function
- [ ] It prevents further overriding

`override` is a check. It catches mismatched signatures (missing `const`, wrong parameter types, typos).
Preventing further overriding is `final`'s job.
:::

:::quiz
When is a virtual function call resolved dynamically (by the object's real type)? (select all that apply)

- [x] `ptr->f()` where `ptr` is a `Base*` pointing to a `Derived`
- [x] `ref.f()` where `ref` is a `Base&` bound to a `Derived`
- [ ] `obj.f()` where `obj` is a `Base` object
- [ ] `ptr->Base::f()`

Dynamic dispatch needs a pointer or reference, and an explicit `Base::` qualification turns it off.
:::

:::exercise Make it virtual {easy}
`report` takes a `const Shape&`, but always prints an area of `0.00` because `area` isn't virtual. Fix
the classes: make `area` and `name` **virtual** in `Shape`, and mark the derived versions **`override`**.

**Input:** lines until end of input, each `circle R` or `rect W H`.
**Output:** for each shape, `NAME: AREA` with the area to 2 decimal places. Use `3.14159265358979` for π.

```cpp starter
#include <iomanip>
#include <iostream>
#include <string>

class Shape {
public:
    double area() const { return 0; }
    std::string name() const { return "shape"; }
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const { return 3.14159265358979 * r_ * r_; }
    std::string name() const { return "circle"; }
};

class Rect : public Shape {
    double w_, h_;
public:
    Rect(double w, double h) : w_(w), h_(h) {}
    double area() const { return w_ * h_; }
    std::string name() const { return "rect"; }
};

void report(const Shape& s) {
    std::cout << s.name() << ": " << std::fixed << std::setprecision(2) << s.area() << '\n';
}

int main() {
    std::string kind;
    while (std::cin >> kind) {
        if (kind == "circle") {
            double r;
            std::cin >> r;
            report(Circle(r));
        } else {
            double w, h;
            std::cin >> w >> h;
            report(Rect(w, h));
        }
    }
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <string>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const { return 0; }
    virtual std::string name() const { return "shape"; }
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

void report(const Shape& s) {
    std::cout << s.name() << ": " << std::fixed << std::setprecision(2) << s.area() << '\n';
}

int main() {
    std::string kind;
    while (std::cin >> kind) {
        if (kind == "circle") {
            double r;
            std::cin >> r;
            report(Circle(r));
        } else {
            double w, h;
            std::cin >> w >> h;
            report(Rect(w, h));
        }
    }
}
```

```hint
Put `virtual` in front of `area` and `name` in `Shape`. In `Circle` and `Rect`, write `override` after `const`.
```

```hint
While you're there, give `Shape` a `virtual ~Shape() = default;`. The "Virtual Destructors" lesson explains why.
```

```stdin
circle 1
rect 3 4.5
```

```expected
circle: 3.14
rect: 13.50
```

```stdin
rect 0 10
circle 2.5
```

```expected hidden
rect: 0.00
circle: 19.63
```

```checks
must virtual\s+double\s+area :: Make area virtual in Shape.
must area\s*\(\s*\)\s*const\s+override :: Mark the derived area functions override.
must name\s*\(\s*\)\s*const\s+override :: Mark the derived name functions override.
```
:::

:::exercise Payroll {medium}
`Employee::pay()` returns the base salary. Write two derived classes that **override** it:

- `Manager(name, salary, bonus)`: pays the base salary **plus** the bonus. Reuse the base version by
  calling `Employee::pay()`.
- `Intern(name, salary)`: pays **half** the base salary (integer division), again via `Employee::pay()`.

**Input:** lines until end of input: `employee NAME SALARY`, `manager NAME SALARY BONUS`, or `intern NAME SALARY`.
**Output:** `NAME: PAY` for each line (printed by `printPay`, which takes a `const Employee&`), then a
final line `total: T`.

```cpp starter
#include <iostream>
#include <string>

class Employee {
    std::string name_;
    long long salary_;
public:
    Employee(const std::string& name, long long salary) : name_(name), salary_(salary) {}
    virtual ~Employee() = default;
    virtual long long pay() const { return salary_; }
    const std::string& name() const { return name_; }
};

// write Manager and Intern here

long long printPay(const Employee& e) {
    std::cout << e.name() << ": " << e.pay() << '\n';
    return e.pay();
}

int main() {
    std::string kind, name;
    long long total = 0;
    while (std::cin >> kind >> name) {
        long long salary;
        std::cin >> salary;
        if (kind == "manager") {
            long long bonus;
            std::cin >> bonus;
            total += printPay(Employee(name, salary));   // use Manager
        } else if (kind == "intern") {
            total += printPay(Employee(name, salary));   // use Intern
        } else {
            total += printPay(Employee(name, salary));
        }
    }
    std::cout << "total: " << total << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

class Employee {
    std::string name_;
    long long salary_;
public:
    Employee(const std::string& name, long long salary) : name_(name), salary_(salary) {}
    virtual ~Employee() = default;
    virtual long long pay() const { return salary_; }
    const std::string& name() const { return name_; }
};

class Manager : public Employee {
    long long bonus_;
public:
    Manager(const std::string& name, long long salary, long long bonus)
        : Employee(name, salary), bonus_(bonus) {}
    long long pay() const override { return Employee::pay() + bonus_; }
};

class Intern : public Employee {
public:
    using Employee::Employee;
    long long pay() const override { return Employee::pay() / 2; }
};

long long printPay(const Employee& e) {
    std::cout << e.name() << ": " << e.pay() << '\n';
    return e.pay();
}

int main() {
    std::string kind, name;
    long long total = 0;
    while (std::cin >> kind >> name) {
        long long salary;
        std::cin >> salary;
        if (kind == "manager") {
            long long bonus;
            std::cin >> bonus;
            total += printPay(Manager(name, salary, bonus));
        } else if (kind == "intern") {
            total += printPay(Intern(name, salary));
        } else {
            total += printPay(Employee(name, salary));
        }
    }
    std::cout << "total: " << total << '\n';
}
```

```hint
`long long pay() const override { return Employee::pay() + bonus_; }`
```

```hint
Since `salary_` is private in `Employee`, `Employee::pay()` is how derived classes get at the base salary.
```

```stdin
employee Ann 3000
manager Bob 5000 1500
intern Cy 2001
```

```expected
Ann: 3000
Bob: 6500
Cy: 1000
total: 10500
```

```stdin
intern Zed 0
manager Max 100 0
```

```expected hidden
Zed: 0
Max: 100
total: 100
```

```checks
must class\s+Manager\s*:\s*public\s+Employee :: Manager should publicly inherit from Employee.
must class\s+Intern\s*:\s*public\s+Employee :: Intern should publicly inherit from Employee.
must Employee::pay\s*\(\s*\) :: Reuse the base implementation with Employee::pay().
must \boverride\b :: Mark the overrides with override.
```
:::

:::exercise Final notifiers {easy}
`Notifier::send` is a non-virtual function that prints whatever the **virtual** `format` returns. Write
two classes, each declared **`final`**, that override `format`:

- `EmailNotifier`: returns `[EMAIL] ` followed by the message.
- `SmsNotifier`: returns `[SMS] ` followed by at most the **first 10 characters** of the message.

**Input:** lines until end of input, each a channel (`email` or `sms`) followed by a one-word message.
**Output:** one line per message, sent through the matching notifier using a `Notifier*` or `Notifier&`.

```cpp starter
#include <iostream>
#include <string>

class Notifier {
public:
    virtual ~Notifier() = default;
    virtual std::string format(const std::string& msg) const { return msg; }
    void send(const std::string& msg) const { std::cout << format(msg) << '\n'; }
};

// write EmailNotifier and SmsNotifier here

int main() {
    Notifier plain;
    std::string channel, msg;
    while (std::cin >> channel >> msg) {
        Notifier* n = &plain;   // pick the right notifier
        n->send(msg);
    }
}
```

```cpp solution
#include <iostream>
#include <string>

class Notifier {
public:
    virtual ~Notifier() = default;
    virtual std::string format(const std::string& msg) const { return msg; }
    void send(const std::string& msg) const { std::cout << format(msg) << '\n'; }
};

class EmailNotifier final : public Notifier {
public:
    std::string format(const std::string& msg) const override { return "[EMAIL] " + msg; }
};

class SmsNotifier final : public Notifier {
public:
    std::string format(const std::string& msg) const override { return "[SMS] " + msg.substr(0, 10); }
};

int main() {
    EmailNotifier email;
    SmsNotifier sms;
    std::string channel, msg;
    while (std::cin >> channel >> msg) {
        Notifier* n = channel == "email" ? static_cast<Notifier*>(&email) : &sms;
        n->send(msg);
    }
}
```

```hint
`class EmailNotifier final : public Notifier { ... };`: `final` goes right after the class name.
```

```hint
`msg.substr(0, 10)` gives at most the first 10 characters (fewer if the string is shorter).
```

```stdin
email hello
sms abcdefghijklmnop
```

```expected
[EMAIL] hello
[SMS] abcdefghij
```

```stdin
sms short
sms exactly10!
email x
```

```expected hidden
[SMS] short
[SMS] exactly10!
[EMAIL] x
```

```checks
must class\s+EmailNotifier\s+final :: Declare EmailNotifier final.
must class\s+SmsNotifier\s+final :: Declare SmsNotifier final.
must format\s*\([^)]*\)\s*const\s+override :: Override format with override.
```
:::

:::exercise Month-end at the bank {hard}
Design a small account hierarchy where each kind of account **overrides** the rules it changes and
**reuses** the base version for the rest.

- `Account` (kind `basic`): holds a private balance. A withdrawal succeeds only if it doesn't make the
  balance negative. Month-end does nothing.
- `Savings : Account` (kind `savings`): at most **2** successful withdrawals per month (further ones are
  refused); otherwise the basic rule applies. At month-end it earns interest of `balance / 100`
  (integer division) and its withdrawal count resets.
- `Checking : Account` (kind `checking`): may go overdrawn down to **-500**. Each withdrawal that leaves
  the balance below zero costs an extra fee of **25** (the fee may push it below -500). At month-end it
  pays a maintenance fee of **5** unless the balance is at least 1000.
- `Premium : Checking`, declared **`final`** (kind `premium`): overdraft limit **-2000** and **no**
  overdraft fee. At month-end it does everything a `Checking` account does, then gets a bonus of **10**.

All accounts live in one container of base-class pointers and are handled only through the base
interface: `withdraw`, `monthEnd` and `kind` must be **virtual**.

**Input:** commands until end of input (all amounts are positive integers):

| Command | Output |
| --- | --- |
| `open KIND NAME AMOUNT` | nothing |
| `deposit NAME X` | `NAME: BALANCE` |
| `withdraw NAME X` | `NAME: BALANCE`, or `NAME: withdrawal refused` |
| `month` | nothing: month-end for every account, in opening order |
| `report` | `KIND NAME BALANCE` for every account, in opening order |

For an unknown name, `deposit` and `withdraw` print `no account NAME`.

```cpp starter
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// design Account, Savings, Checking and Premium here

int main() {
    // read commands until end of input
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Account {
    std::string name_;
    long long balance_;

protected:
    void adjust(long long delta) { balance_ += delta; }   // for fees and interest

public:
    Account(std::string name, long long balance) : name_(std::move(name)), balance_(balance) {}
    virtual ~Account() = default;

    const std::string& name() const { return name_; }
    long long balance() const { return balance_; }
    void deposit(long long x) { balance_ += x; }

    virtual std::string kind() const { return "basic"; }
    virtual bool withdraw(long long x) {
        if (x > balance_) return false;
        balance_ -= x;
        return true;
    }
    virtual void monthEnd() {}
};

class Savings : public Account {
    int withdrawals_ = 0;
public:
    using Account::Account;
    std::string kind() const override { return "savings"; }
    bool withdraw(long long x) override {
        if (withdrawals_ >= 2) return false;
        if (!Account::withdraw(x)) return false;
        ++withdrawals_;
        return true;
    }
    void monthEnd() override {
        adjust(balance() / 100);
        withdrawals_ = 0;
    }
};

class Checking : public Account {
protected:
    virtual long long overdraftLimit() const { return 500; }
    virtual long long overdraftFee() const { return 25; }
public:
    using Account::Account;
    std::string kind() const override { return "checking"; }
    bool withdraw(long long x) override {
        if (balance() - x < -overdraftLimit()) return false;
        adjust(-x);
        if (balance() < 0) adjust(-overdraftFee());
        return true;
    }
    void monthEnd() override {
        if (balance() < 1000) adjust(-5);
    }
};

class Premium final : public Checking {
protected:
    long long overdraftLimit() const override { return 2000; }
    long long overdraftFee() const override { return 0; }
public:
    using Checking::Checking;
    std::string kind() const override { return "premium"; }
    void monthEnd() override {
        Checking::monthEnd();
        adjust(10);
    }
};

std::unique_ptr<Account> makeAccount(const std::string& kind, const std::string& name, long long amount) {
    if (kind == "savings") return std::make_unique<Savings>(name, amount);
    if (kind == "checking") return std::make_unique<Checking>(name, amount);
    if (kind == "premium") return std::make_unique<Premium>(name, amount);
    return std::make_unique<Account>(name, amount);
}

Account* findAccount(const std::vector<std::unique_ptr<Account>>& accounts, const std::string& name) {
    for (const auto& a : accounts)
        if (a->name() == name) return a.get();
    return nullptr;
}

int main() {
    std::vector<std::unique_ptr<Account>> accounts;

    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "open") {
            std::string kind, name;
            long long amount;
            std::cin >> kind >> name >> amount;
            accounts.push_back(makeAccount(kind, name, amount));
        } else if (cmd == "deposit" || cmd == "withdraw") {
            std::string name;
            long long x;
            std::cin >> name >> x;
            Account* a = findAccount(accounts, name);
            if (!a) {
                std::cout << "no account " << name << '\n';
            } else if (cmd == "deposit") {
                a->deposit(x);
                std::cout << name << ": " << a->balance() << '\n';
            } else if (a->withdraw(x)) {
                std::cout << name << ": " << a->balance() << '\n';
            } else {
                std::cout << name << ": withdrawal refused\n";
            }
        } else if (cmd == "month") {
            for (auto& a : accounts) a->monthEnd();
        } else if (cmd == "report") {
            for (const auto& a : accounts) std::cout << a->kind() << ' ' << a->name() << ' ' << a->balance() << '\n';
        }
    }
}
```

```hint
Store the accounts as `std::vector<std::unique_ptr<Account>>` and create them with
`std::make_unique<Savings>(name, amount)` and so on: a `unique_ptr<Savings>` converts to a
`unique_ptr<Account>`. Give `Account` a `virtual ~Account() = default;` (the "Virtual Destructors"
lesson explains why) and a **protected** `adjust(delta)` so derived classes can apply fees and interest
without the balance being public.
```

```hint
Reuse instead of repeating: `Savings::withdraw` checks its counter and then calls `Account::withdraw(x)`;
`Premium::monthEnd` calls `Checking::monthEnd()` and adds the bonus. For `Premium`'s different
overdraft rules, let `Checking` ask two small **virtual** functions for its limit and fee, and override
just those in `Premium`.
```

```stdin
open savings sam 1000
open checking cat 100
open premium pat 0
open basic bo 50
withdraw sam 100
withdraw sam 100
withdraw sam 100
withdraw cat 300
withdraw cat 300
withdraw pat 1500
withdraw bo 60
month
report
withdraw sam 100
```

```expected
sam: 900
sam: 800
sam: withdrawal refused
cat: -225
cat: withdrawal refused
pat: -1500
bo: withdrawal refused
savings sam 808
checking cat -230
premium pat -1495
basic bo 50
sam: 708
```

```stdin
deposit ghost 5
withdraw ghost 5
open checking c 1000
open premium p 1000
open savings s 99
month
report
withdraw c 1000
withdraw c 500
withdraw p 3011
withdraw p 1
deposit p 5000
month
report
```

```expected hidden
no account ghost
no account ghost
checking c 1000
premium p 1010
savings s 99
c: 0
c: -525
p: withdrawal refused
p: 1009
p: 6009
checking c -530
premium p 6019
savings s 99
```

```stdin
open savings s 500
withdraw s 600
withdraw s 500
withdraw s 1
deposit s 300
withdraw s 100
withdraw s 100
month
withdraw s 50
report
open basic b 0
withdraw b 1
deposit b 1
withdraw b 1
month
report
```

```expected hidden
s: withdrawal refused
s: 0
s: withdrawal refused
s: 300
s: 200
s: withdrawal refused
s: 152
savings s 152
b: withdrawal refused
b: 1
b: 0
savings s 153
basic b 0
```

```checks
must virtual\s+bool\s+withdraw :: Make withdraw virtual in Account.
must virtual\s+void\s+monthEnd :: Make monthEnd virtual in Account.
must class\s+Premium\s+final\s*:\s*public\s+Checking :: Premium must be a final class derived from Checking.
must Account::withdraw\s*\( :: Reuse the base rule with Account::withdraw(...).
must Checking::monthEnd\s*\( :: Premium's month-end should call Checking::monthEnd().
must \boverride\b :: Mark overrides with override.
```
:::
