---
title: Inheritance Basics
summary: Base and derived classes, the "is-a" relationship, protected members, construction and destruction order, calling and inheriting base constructors, and name hiding.
---

## Building new classes from existing ones

Often several types share a core and differ in details. A dog and a cat are both animals: they both
have a name and an age, and both can eat. **Inheritance** lets you write the shared part once, in a
**base class**, and create **derived classes** that automatically get everything the base has, plus
their own additions.

- **Base class** (also *parent* or *superclass*): the general type, e.g. `Animal`.
- **Derived class** (also *child* or *subclass*): the specialized type, e.g. `Dog`.

The relationship inheritance models is **"is-a"**: a `Dog` **is an** `Animal`. Anywhere an `Animal` is
expected, a `Dog` should make sense. If you can't honestly say "X is a Y", inheritance is probably
the wrong tool (see the next lesson).

```cpp run
#include <iostream>
#include <string>

class Animal {
public:
    std::string name;
    int age = 0;

    void eat() const { std::cout << name << " is eating\n"; }
};

class Dog : public Animal {          // Dog inherits from Animal
public:
    std::string breed;               // Dog adds a member...

    void fetch() const {             // ...and a member function
        std::cout << name << " the " << breed << " fetches the ball\n";
    }
};

int main() {
    Dog d;
    d.name = "Rex";       // inherited from Animal
    d.age = 3;            // inherited from Animal
    d.breed = "beagle";   // Dog's own
    d.eat();              // inherited member function
    d.fetch();
}
```

```output
Rex is eating
Rex the beagle fetches the ball
```

The syntax is `class Derived : access Base { ... };`. The `public` before `Animal` is the **inheritance
access**: with `public` inheritance, public members of `Animal` stay public in `Dog`. It's what you want
for "is-a" almost every time. (The other options are in the next lesson.)

Inside memory, a `Dog` object **contains** a complete `Animal` object (its **base class subobject**),
followed by `Dog`'s own members:

```
 Dog object
 ┌──────────────────────┐
 │ Animal part: name    │
 │              age     │
 ├──────────────────────┤
 │ Dog part:    breed   │
 └──────────────────────┘
```

Inheritance chains can go as deep as you like: `class Puppy : public Dog` is an `Animal` too.

## Access: `protected` members

A derived class inherits **all** members of the base, but it can't access the base's **private** ones.
They're there in memory, just off-limits, even to the derived class. That's deliberate: the base class
protects its invariants from its children too.

The middle level, **`protected`**, means "private to the outside world, but accessible to derived classes":

```cpp compile-error
class Account {
private:
    double balance_ = 0;        // only Account's members
protected:
    int transactions_ = 0;      // Account's and derived classes' members
public:
    double balance() const { return balance_; }
};

class Savings : public Account {
public:
    void addInterest() {
        ++transactions_;        // OK: protected
        balance_ *= 1.02;       // error: 'double Account::balance_' is private within this context
    }
};

int main() {
    Savings s;
    s.transactions_ = 5;        // error: protected members are not accessible from outside
}
```

Derived classes should usually work through the base's public (or protected) **member functions**
rather than its data. Making data `protected` exposes it to every derived class anyone ever writes,
so prefer `private` data plus `protected` helper functions.

| Base member is | Base's own members | Derived class's members | Outside code |
| --- | --- | --- | --- |
| `public` | ✓ | ✓ | ✓ |
| `protected` | ✓ | ✓ | ✗ |
| `private` | ✓ | ✗ | ✗ |

## Constructors and destructors in inheritance

Constructors are **not** inherited automatically, and a derived constructor doesn't build the base
part itself. Instead, **the base class subobject is constructed first**, by a base constructor, before
the derived class's members and body. Destruction runs in **exactly the reverse** order.

```cpp run
#include <iostream>

class Base {
public:
    Base()  { std::cout << "Base constructor\n"; }
    ~Base() { std::cout << "Base destructor\n"; }
};

class Member {
public:
    Member()  { std::cout << "  Member constructor\n"; }
    ~Member() { std::cout << "  Member destructor\n"; }
};

class Derived : public Base {
    Member m_;
public:
    Derived()  { std::cout << "    Derived constructor body\n"; }
    ~Derived() { std::cout << "    Derived destructor body\n"; }
};

int main() {
    Derived d;
    std::cout << "--- d is alive ---\n";
}
```

```output
Base constructor
  Member constructor
    Derived constructor body
--- d is alive ---
    Derived destructor body
  Member destructor
Base destructor
```

Order of construction: **base(s) → members (in declaration order) → derived constructor body**.
Destruction: **derived destructor body → members (reverse) → base(s)**. It makes sense: the derived
part is built on top of the base, so the base must exist first and be torn down last.

### Calling a base constructor

If the base has no default constructor, or you want a specific one, call it in the derived
constructor's **member initializer list**, by the base class's name. It's the only place you can:

```cpp run
#include <iostream>
#include <string>

class Animal {
    std::string name_;
    int age_;
public:
    Animal(const std::string& name, int age) : name_(name), age_(age) {
        std::cout << "Animal(" << name_ << ")\n";
    }
    const std::string& name() const { return name_; }
    int age() const { return age_; }
};

class Dog : public Animal {
    std::string breed_;
public:
    Dog(const std::string& name, int age, const std::string& breed)
        : Animal(name, age),          // construct the base part first
          breed_(breed) {
        std::cout << "Dog(" << breed_ << ")\n";
    }
    void describe() const {
        std::cout << name() << ", " << age() << ", " << breed_ << '\n';   // base's public getters
    }
};

int main() {
    Dog d("Rex", 3, "beagle");
    d.describe();
}
```

```output
Animal(Rex)
Dog(beagle)
Rex, 3, beagle
```

The base must come first in the list by convention, because it's initialized first anyway (GCC's
`-Wreorder` warns otherwise). Forgetting to call it when the base has no default constructor is an error:

```cpp compile-error
class Animal {
public:
    explicit Animal(int age) {}
};

class Dog : public Animal {
public:
    Dog() {}      // error: no matching function for call to 'Animal::Animal()'
};

int main() { Dog d; }
```

### Inheriting constructors: `using Base::Base;`

When the derived class adds no data that needs initializing, rewriting every base constructor just to
forward the arguments is tedious. Since C++11, `using Base::Base;` makes all of the base's constructors
available as derived constructors:

```cpp run
#include <iostream>
#include <string>

class Message {
protected:
    std::string text_;
    int priority_;
public:
    explicit Message(const std::string& text) : text_(text), priority_(0) {}
    Message(const std::string& text, int priority) : text_(text), priority_(priority) {}
};

class LoudMessage : public Message {
public:
    using Message::Message;          // inherit both constructors

    void shout() const {
        std::cout << text_ << "!!! (priority " << priority_ << ")\n";
    }
};

int main() {
    LoudMessage a("hello");
    LoudMessage b("fire", 9);
    a.shout();
    b.shout();
}
```

```output
hello!!! (priority 0)
fire!!! (priority 9)
```

Any members the derived class adds are default-initialized (or use their default member initializers),
so give them initializers if you inherit constructors.

## Name hiding

If a derived class declares a member function with the **same name** as one in the base, it **hides
every base function with that name**, even ones with different parameters. Overloading doesn't work
across the base/derived boundary:

```cpp compile-error
#include <iostream>
#include <string>

class Printer {
public:
    void print(int x) const { std::cout << x << '\n'; }
    void print(double x) const { std::cout << x << '\n'; }
};

class FancyPrinter : public Printer {
public:
    void print(const std::string& s) const { std::cout << "*" << s << "*\n"; }
};

int main() {
    FancyPrinter p;
    p.print("hi");   // OK
    p.print(42);     // error: no matching function: Printer::print(int) is hidden
}
```

Two fixes: bring the base overloads into the derived class's scope with a **using-declaration**, or
call the base version explicitly with `Base::name`:

```cpp run
#include <iostream>
#include <string>

class Printer {
public:
    void print(int x) const { std::cout << x << '\n'; }
    void print(double x) const { std::cout << x << '\n'; }
};

class FancyPrinter : public Printer {
public:
    using Printer::print;            // un-hide all of Printer's print overloads
    void print(const std::string& s) const { std::cout << "*" << s << "*\n"; }
};

int main() {
    FancyPrinter p;
    p.print("hi");
    p.print(42);
    p.print(2.5);
    p.Printer::print(7);             // explicitly call the base version
}
```

```output
*hi*
42
2.5
7
```

### Reusing the base version inside the derived one

A derived function often wants to *extend* the base behavior rather than replace it. Call the base
version with `Base::function()`:

```cpp run
#include <iostream>

class Report {
public:
    void print() const { std::cout << "== Report ==\n"; }
};

class SalesReport : public Report {
public:
    void print() const {
        Report::print();                      // do the base part first
        std::cout << "Sales: 1200 units\n";   // then add to it
    }
};

int main() {
    SalesReport r;
    r.print();
}
```

```output
== Report ==
Sales: 1200 units
```

Without the `Report::` prefix, `print()` would call `SalesReport::print` again: infinite recursion.

## A first look at base references

Because a `Dog` *is an* `Animal`, a `Dog` can be used wherever an `Animal&` or `Animal*` is expected.
This is called **upcasting** and is automatic. But with ordinary member functions, the call is decided
by the **static type** (the type the reference was declared with), not the real object:

```cpp run
#include <iostream>

class Animal {
public:
    void speak() const { std::cout << "...\n"; }
};

class Dog : public Animal {
public:
    void speak() const { std::cout << "Woof\n"; }
};

void makeItSpeak(const Animal& a) { a.speak(); }

int main() {
    Dog d;
    d.speak();          // Woof
    makeItSpeak(d);     // "..." : Animal::speak, because the reference's type is Animal
}
```

```output
Woof
...
```

Getting `Woof` from the second call requires **virtual functions**, the key to polymorphism, coming up
in two lessons.

:::quiz
In what order are these constructed when you create a `Derived` object? `class Derived : public Base { Member m; };`

- [ ] `Derived` body, `m`, `Base`
- [x] `Base`, `m`, `Derived` body
- [ ] `m`, `Base`, `Derived` body
- [ ] `Base`, `Derived` body, `m`

Base subobjects first, then members in declaration order, then the constructor body. Destruction is the reverse.
:::

:::quiz
`Base` has a `private` member `secret_` and a `protected` member `shared_`. Inside a member function of `class Derived : public Base`, which can you use?

- [ ] Both
- [x] Only `shared_`
- [ ] Only `secret_`
- [ ] Neither

Private members are inherited (they exist in the object) but are accessible only to `Base` itself and its friends.
:::

:::quiz
`Base` has `void f(int)`. `Derived` (public inheritance) declares `void f(std::string)`. What happens with `Derived d; d.f(5);`?

- [ ] It calls `Base::f(int)`
- [x] Compile error, because `Derived::f` hides `Base::f`
- [ ] It converts `5` to a string
- [ ] Runtime error

Name lookup finds `f` in `Derived` and stops there. Add `using Base::f;` to `Derived` to make both visible.
:::

:::exercise Animal and dog
Write `class Dog` that **publicly inherits** from `Animal`:

- Its constructor `Dog(name, breed)` passes the name to `Animal`'s constructor (in the initializer list)
  and stores the breed.
- `void describe() const` prints `NAME is a BREED`, using the inherited `name()`.

**Input:** a name and a breed (single words).
**Output:** two lines: `describe()`'s output, then `eat()`'s output (inherited, already written).

```cpp starter
#include <iostream>
#include <string>

class Animal {
    std::string name_;
public:
    explicit Animal(const std::string& name) : name_(name) {}
    const std::string& name() const { return name_; }
    void eat() const { std::cout << name_ << " is eating\n"; }
};

// write class Dog here

int main() {
    std::string name, breed;
    std::cin >> name >> breed;
    // Dog d(name, breed);
    // d.describe();
    // d.eat();
}
```

```cpp solution
#include <iostream>
#include <string>

class Animal {
    std::string name_;
public:
    explicit Animal(const std::string& name) : name_(name) {}
    const std::string& name() const { return name_; }
    void eat() const { std::cout << name_ << " is eating\n"; }
};

class Dog : public Animal {
    std::string breed_;
public:
    Dog(const std::string& name, const std::string& breed) : Animal(name), breed_(breed) {}
    void describe() const { std::cout << name() << " is a " << breed_ << '\n'; }
};

int main() {
    std::string name, breed;
    std::cin >> name >> breed;
    Dog d(name, breed);
    d.describe();
    d.eat();
}
```

```hint
`class Dog : public Animal { ... };` and the constructor: `Dog(const std::string& name, const std::string& breed) : Animal(name), breed_(breed) {}`.
```

```stdin
Rex beagle
```

```expected
Rex is a beagle
Rex is eating
```

```stdin
Luna husky
```

```expected hidden
Luna is a husky
Luna is eating
```

```checks
must class\s+Dog\s*:\s*public\s+Animal :: Dog must publicly inherit from Animal.
must :\s*Animal\s*\(\s*\w+\s*\) :: Call Animal's constructor from Dog's initializer list.
```
:::

:::exercise Construction order
`Vehicle` and `Car` both print messages from their constructors and destructors. `Car` inherits from
`Vehicle` and has an `Engine` member. Complete `Car` so that:

- its constructor calls `Vehicle(name)` in the initializer list and constructs `engine_` with the
  horsepower, then prints `Car NAME ready`,
- its destructor prints `Car NAME scrapped`.

**Input:** a name and a horsepower number.
**Output:** the construction lines, `driving`, then the destruction lines. For `Zoom 300`:

```
Vehicle Zoom
Engine 300hp
Car Zoom ready
driving
Car Zoom scrapped
Engine off
Vehicle Zoom gone
```

```cpp starter
#include <iostream>
#include <string>

class Vehicle {
protected:
    std::string name_;
public:
    explicit Vehicle(const std::string& name) : name_(name) { std::cout << "Vehicle " << name_ << '\n'; }
    ~Vehicle() { std::cout << "Vehicle " << name_ << " gone\n"; }
};

class Engine {
public:
    explicit Engine(int hp) { std::cout << "Engine " << hp << "hp\n"; }
    ~Engine() { std::cout << "Engine off\n"; }
};

class Car {
    // make Car inherit from Vehicle and add an Engine member
public:
    Car(const std::string&, int) {}
};

int main() {
    std::string name;
    int hp;
    std::cin >> name >> hp;
    Car c(name, hp);
    std::cout << "driving\n";
}
```

```cpp solution
#include <iostream>
#include <string>

class Vehicle {
protected:
    std::string name_;
public:
    explicit Vehicle(const std::string& name) : name_(name) { std::cout << "Vehicle " << name_ << '\n'; }
    ~Vehicle() { std::cout << "Vehicle " << name_ << " gone\n"; }
};

class Engine {
public:
    explicit Engine(int hp) { std::cout << "Engine " << hp << "hp\n"; }
    ~Engine() { std::cout << "Engine off\n"; }
};

class Car : public Vehicle {
    Engine engine_;
public:
    Car(const std::string& name, int hp) : Vehicle(name), engine_(hp) {
        std::cout << "Car " << name_ << " ready\n";
    }
    ~Car() { std::cout << "Car " << name_ << " scrapped\n"; }
};

int main() {
    std::string name;
    int hp;
    std::cin >> name >> hp;
    Car c(name, hp);
    std::cout << "driving\n";
}
```

```hint
`class Car : public Vehicle { Engine engine_; ... };` and the initializer list `: Vehicle(name), engine_(hp)`.
```

```hint
You don't need to arrange the order: C++ always builds the base first, then members, then runs the body. Destruction is automatic and reversed.
```

```stdin
Zoom 300
```

```expected
Vehicle Zoom
Engine 300hp
Car Zoom ready
driving
Car Zoom scrapped
Engine off
Vehicle Zoom gone
```

```stdin
T 0
```

```expected hidden
Vehicle T
Engine 0hp
Car T ready
driving
Car T scrapped
Engine off
Vehicle T gone
```

```checks
must class\s+Car\s*:\s*public\s+Vehicle :: Car must inherit publicly from Vehicle.
must :\s*Vehicle\s*\( :: Call Vehicle's constructor in Car's initializer list.
must ~Car\s*\( :: Give Car a destructor.
```
:::

:::exercise Inherited constructors
`Counter` has two constructors: `Counter(start)` (step 1) and `Counter(start, step)`. Write
`class StepCounter : public Counter` that **inherits both constructors with a using-declaration** and
adds `void advance(int times)`, which calls the inherited `tick()` that many times.

**Input:** `start step times`. If `step` is `0`, construct with `StepCounter(start)` instead (step 1).
**Output:** the value after advancing.

```cpp starter
#include <iostream>

class Counter {
    long long value_;
    long long step_;
public:
    explicit Counter(long long start) : value_(start), step_(1) {}
    Counter(long long start, long long step) : value_(start), step_(step) {}
    void tick() { value_ += step_; }
    long long value() const { return value_; }
};

class StepCounter : public Counter {
public:
    StepCounter(long long start, long long step) : Counter(start, step) {}
    void advance(int) {}
};

int main() {
    long long start, step;
    int times;
    std::cin >> start >> step >> times;
    if (step == 0) {
        StepCounter c(start, 1);   // use StepCounter c(start); once constructors are inherited
        c.advance(times);
        std::cout << c.value() << '\n';
    } else {
        StepCounter c(start, step);
        c.advance(times);
        std::cout << c.value() << '\n';
    }
}
```

```cpp solution
#include <iostream>

class Counter {
    long long value_;
    long long step_;
public:
    explicit Counter(long long start) : value_(start), step_(1) {}
    Counter(long long start, long long step) : value_(start), step_(step) {}
    void tick() { value_ += step_; }
    long long value() const { return value_; }
};

class StepCounter : public Counter {
public:
    using Counter::Counter;
    void advance(int times) {
        for (int i = 0; i < times; ++i) tick();
    }
};

int main() {
    long long start, step;
    int times;
    std::cin >> start >> step >> times;
    if (step == 0) {
        StepCounter c(start);
        c.advance(times);
        std::cout << c.value() << '\n';
    } else {
        StepCounter c(start, step);
        c.advance(times);
        std::cout << c.value() << '\n';
    }
}
```

```hint
Replace the hand-written constructor with `using Counter::Counter;`.
```

```stdin
10 5 3
```

```expected
25
```

```stdin
7 0 4
```

```expected hidden
11
```

```stdin
0 -3 0
```

```expected hidden
0
```

```checks
must using\s+Counter::Counter\s*; :: Inherit the constructors with using Counter::Counter;
must StepCounter\s+c\s*\(\s*start\s*\) :: Use the inherited one-argument constructor: StepCounter c(start).
```
:::

:::exercise Unhide the overloads
`Logger` has `log(int)` and `log(double)`. `TagLogger` adds `log(const std::string&)`, which **hides**
the base overloads, so `main` doesn't compile. Fix `TagLogger` (not `main`) so all three work.

**Input:** an integer, a decimal number, and a word.
**Output:** three lines, from `log(int)`, `log(double)`, and `log(string)` in that order.

```cpp starter broken
#include <iostream>
#include <string>

class Logger {
public:
    void log(int x) const { std::cout << "int: " << x << '\n'; }
    void log(double x) const { std::cout << "double: " << x << '\n'; }
};

class TagLogger : public Logger {
public:
    void log(const std::string& s) const { std::cout << "tag: #" << s << '\n'; }
};

int main() {
    int i;
    double d;
    std::string w;
    std::cin >> i >> d >> w;
    TagLogger t;
    t.log(i);
    t.log(d);
    t.log(w);
}
```

```cpp solution
#include <iostream>
#include <string>

class Logger {
public:
    void log(int x) const { std::cout << "int: " << x << '\n'; }
    void log(double x) const { std::cout << "double: " << x << '\n'; }
};

class TagLogger : public Logger {
public:
    using Logger::log;
    void log(const std::string& s) const { std::cout << "tag: #" << s << '\n'; }
};

int main() {
    int i;
    double d;
    std::string w;
    std::cin >> i >> d >> w;
    TagLogger t;
    t.log(i);
    t.log(d);
    t.log(w);
}
```

```hint
A using-declaration inside `TagLogger` brings the base's overloads back into view.
```

```stdin
42 2.5 cpp
```

```expected
int: 42
double: 2.5
tag: #cpp
```

```stdin
-1 0.125 x
```

```expected hidden
int: -1
double: 0.125
tag: #x
```

```checks
must using\s+Logger::log\s*; :: Add using Logger::log; to TagLogger.
```
:::
