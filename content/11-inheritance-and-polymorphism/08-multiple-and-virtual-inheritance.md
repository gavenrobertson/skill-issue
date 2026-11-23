---
title: Multiple & Virtual Inheritance
summary: Inheriting from several base classes, resolving name ambiguities, the diamond problem, virtual inheritance, and practical guidance on when multiple inheritance is a good idea.
---

## Inheriting from more than one base

C++ lets a class have **several direct base classes**. List them separated by commas, each with its
own access specifier:

```cpp run
#include <iostream>
#include <string>

class Flyer {
public:
    void fly() const { std::cout << "flying\n"; }
};

class Swimmer {
public:
    void swim() const { std::cout << "swimming\n"; }
};

class Duck : public Flyer, public Swimmer {     // two bases
public:
    void quack() const { std::cout << "quack\n"; }
};

void takeOff(const Flyer& f) { f.fly(); }
void dive(const Swimmer& s) { s.swim(); }

int main() {
    Duck d;
    d.fly();          // from Flyer
    d.swim();         // from Swimmer
    d.quack();
    takeOff(d);       // a Duck is a Flyer...
    dive(d);          // ...and a Swimmer
}
```

```output
flying
swimming
quack
flying
swimming
```

A `Duck` object contains a complete `Flyer` subobject **and** a complete `Swimmer` subobject, and it can
be upcast to either.

> **Pitfall:** The access specifier applies to **one** base only. `class Duck : public Flyer, Swimmer`
> inherits `Swimmer` **privately** (the `class` default). Write `public` before every base.

## Construction order

Base classes are constructed **in the order they're listed in the class's base list**, then members,
then the constructor body. The order you write them in the initializer list doesn't matter (and GCC's
`-Wreorder` warns if it differs). Destruction is the reverse:

```cpp run
#include <iostream>

struct A { A() { std::cout << "A "; } ~A() { std::cout << "~A "; } };
struct B { B() { std::cout << "B "; } ~B() { std::cout << "~B "; } };
struct M { M() { std::cout << "M "; } ~M() { std::cout << "~M "; } };

struct C : public A, public B {      // A first, then B, because that's the base-list order
    M member;
    C() { std::cout << "C\n"; }
    ~C() { std::cout << "~C "; }
};

int main() {
    {
        C c;
    }
    std::cout << '\n';
}
```

```output
A B M C
~C ~M ~B ~A
```

## Ambiguous names

If two bases have a member with the same name, the derived class inherits **both**. Merely having
both is fine; *using* the name unqualified is an error, because the compiler can't choose:

```cpp compile-error
#include <iostream>

class Camera {
public:
    void powerOn() const { std::cout << "camera on\n"; }
};

class Phone {
public:
    void powerOn() const { std::cout << "phone on\n"; }
};

class SmartPhone : public Camera, public Phone {};

int main() {
    SmartPhone s;
    s.powerOn();     // error: request for member 'powerOn' is ambiguous
}
```

Three ways to resolve it:

```cpp run
#include <iostream>

class Camera {
public:
    void powerOn() const { std::cout << "camera on\n"; }
    void zoom() const { std::cout << "camera zoom\n"; }
};

class Phone {
public:
    void powerOn() const { std::cout << "phone on\n"; }
    void zoom() const { std::cout << "phone zoom\n"; }
};

class SmartPhone : public Camera, public Phone {
public:
    using Camera::zoom;                 // 2. pick one base's version for the derived class

    void powerOn() const {              // 3. define the derived version, combining both
        Phone::powerOn();
        Camera::powerOn();
    }
};

int main() {
    SmartPhone s;
    s.Camera::powerOn();                // 1. qualify the call at the call site
    std::cout << "--\n";
    s.zoom();                           // Camera::zoom, via the using-declaration
    std::cout << "--\n";
    s.powerOn();                        // SmartPhone::powerOn
}
```

```output
camera on
--
camera zoom
--
phone on
camera on
```

Option 3 is usually the best design: decide in **one** place what the combined class should do.

## The diamond problem

Trouble really starts when two bases share a **common base** of their own. The class diagram forms a
diamond:

```
        Device
        /    \
   Scanner  Printer
        \    /
        Copier
```

With ordinary inheritance, `Scanner` and `Printer` each contain their **own** `Device` subobject, so a
`Copier` contains **two** `Device`s. Which one's `id` is "the" id? The compiler won't guess:

```cpp compile-error
class Device {
public:
    int id = 0;
};

class Scanner : public Device {};
class Printer : public Device {};
class Copier : public Scanner, public Printer {};

int main() {
    Copier c;
    c.id = 5;               // error: request for member 'id' is ambiguous
    Device* d = &c;         // error: 'Device' is an ambiguous base of 'Copier'
}
```

```
  Copier object (ordinary inheritance)
 ┌──────────────────────┐
 │ Scanner              │
 │   └─ Device (id)     │  ← one Device
 ├──────────────────────┤
 │ Printer              │
 │   └─ Device (id)     │  ← a second, separate Device
 └──────────────────────┘
```

You can disambiguate with `c.Scanner::id`, but for a "device" that's conceptually one thing, having two
copies of its state is simply wrong: powering on the scanner part wouldn't power on the printer part.

## Virtual inheritance

**Virtual inheritance** tells the compiler that a base class should be **shared**: no matter how many
paths lead to it, the most-derived object contains **exactly one** subobject of it. Write `virtual` in
the base lists of the *middle* classes:

```cpp run
#include <iostream>

class Device {
    int id_;
public:
    explicit Device(int id) : id_(id) { std::cout << "Device " << id_ << " constructed\n"; }
    int id() const { return id_; }
};

class Scanner : virtual public Device {         // virtual inheritance
public:
    explicit Scanner(int id) : Device(id) { std::cout << "Scanner ready\n"; }
};

class Printer : virtual public Device {         // virtual inheritance
public:
    explicit Printer(int id) : Device(id) { std::cout << "Printer ready\n"; }
};

class Copier : public Scanner, public Printer {
public:
    // The MOST-DERIVED class constructs the virtual base, directly:
    explicit Copier(int id) : Device(id), Scanner(id), Printer(id) {
        std::cout << "Copier ready\n";
    }
};

int main() {
    Copier c(42);
    std::cout << "id: " << c.id() << '\n';      // no ambiguity: there's only one Device
    Device& d = c;                              // and the upcast is unambiguous
    std::cout << "via Device&: " << d.id() << '\n';
}
```

```output
Device 42 constructed
Scanner ready
Printer ready
Copier ready
id: 42
via Device&: 42
```

The special rules that come with virtual bases:

- **The most-derived class initializes the virtual base.** When building a `Copier`, the `Device(id)`
  initializers in `Scanner`'s and `Printer`'s constructors are **ignored**: otherwise the shared
  `Device` would be constructed twice. If `Copier` doesn't mention `Device` in its initializer list,
  `Device`'s **default** constructor is used (a compile error here, since there isn't one).
- **Virtual bases are constructed first**, before any non-virtual bases, and destroyed last.
- The middle classes still initialize `Device` normally when *they* are the most-derived type
  (a standalone `Scanner s(1);` uses `Scanner`'s `Device(id)`).
- Accessing a virtual base costs an extra indirection, and you can't `static_cast` from a virtual base
  down to a derived class (`dynamic_cast` works).

A real example of a diamond with virtual inheritance is in the standard library itself: `std::iostream`
derives from both `std::istream` and `std::ostream`, which both virtually derive from `std::ios`
(`std::basic_ios`), so a bidirectional stream has one shared stream state.

## Practical guidance

Multiple inheritance has a bad reputation because of diamonds of **stateful** classes. The safe and
genuinely useful patterns:

- **Multiple interfaces.** Inheriting from several abstract classes with no data (only pure virtual
  functions and a virtual destructor) has none of the problems above. It's how a class says "I can be
  printed, *and* serialized, *and* compared". This is what Java and C# allow with `interface`.
- **Mixins.** Small bases that add one self-contained capability (counting instances, non-copyability,
  logging) to whatever class inherits them.
- **Cross-casting.** With several interfaces, `dynamic_cast` can ask an object for *another* interface it
  might implement:

```cpp run
#include <iostream>
#include <string>

class Printable {
public:
    virtual ~Printable() = default;
    virtual std::string toText() const = 0;
};

class Savable {
public:
    virtual ~Savable() = default;
    virtual std::string serialize() const = 0;
};

class Note : public Printable, public Savable {
public:
    std::string toText() const override { return "Note: buy milk"; }
    std::string serialize() const override { return "{\"note\":\"buy milk\"}"; }
};

int main() {
    Note n;
    const Printable& p = n;
    std::cout << p.toText() << '\n';
    if (auto s = dynamic_cast<const Savable*>(&p)) {   // cross-cast: Printable -> Savable
        std::cout << s->serialize() << '\n';
    }
}
```

```output
Note: buy milk
{"note":"buy milk"}
```

And the rules of thumb:

- Avoid diamonds of classes with data. If you design one, use virtual inheritance and document who
  initializes the shared base.
- If you're reaching for multiple inheritance to **reuse code** rather than to express "is-a" for
  several interfaces, composition is almost always simpler.

:::quiz
`class C : public A, public B { M m; };` In what order are the parts constructed?

- [ ] `B`, `A`, `m`, `C` body
- [x] `A`, `B`, `m`, `C` body
- [ ] `m`, `A`, `B`, `C` body
- [ ] It depends on the order in `C`'s initializer list

Bases are constructed in base-list order (`A`, then `B`), then members, then the body. The
initializer-list order is irrelevant.
:::

:::quiz
`Scanner` and `Printer` both inherit **virtually** from `Device`, and `Copier` inherits from both. Who constructs the `Device` subobject of a `Copier`?

- [ ] `Scanner`'s constructor
- [ ] `Printer`'s constructor
- [ ] Both, once each
- [x] `Copier`'s constructor (the most-derived class)

A virtual base is initialized exactly once, by the most-derived class. The middle classes' initializers
for it are skipped.
:::

:::quiz
`class Robot : public Walker, Talker { };` How does `Robot` inherit from `Talker`?

- [ ] publicly
- [x] privately
- [ ] protected
- [ ] virtually

Each base needs its own access specifier; `Talker` gets the `class` default, which is private.
:::

:::exercise Two interfaces
`Point` should implement two interfaces at once, `Printable` and `Serializable`. Make it inherit
**publicly from both** and implement:

- `toText()`, returning `Point(X, Y)`,
- `serialize()`, returning `X,Y`.

`main` uses the point through each interface separately.

**Input:** two integers `x y`.
**Output:** two lines: the text form, then the serialized form.

```cpp starter
#include <iostream>
#include <string>

class Printable {
public:
    virtual ~Printable() = default;
    virtual std::string toText() const = 0;
};

class Serializable {
public:
    virtual ~Serializable() = default;
    virtual std::string serialize() const = 0;
};

class Point {
    int x_, y_;
public:
    Point(int x, int y) : x_(x), y_(y) {}
};

void show(const Printable& p) { std::cout << p.toText() << '\n'; }
void save(const Serializable& s) { std::cout << s.serialize() << '\n'; }

int main() {
    int x, y;
    std::cin >> x >> y;
    Point p(x, y);
    // show(p);
    // save(p);
}
```

```cpp solution
#include <iostream>
#include <string>

class Printable {
public:
    virtual ~Printable() = default;
    virtual std::string toText() const = 0;
};

class Serializable {
public:
    virtual ~Serializable() = default;
    virtual std::string serialize() const = 0;
};

class Point : public Printable, public Serializable {
    int x_, y_;
public:
    Point(int x, int y) : x_(x), y_(y) {}
    std::string toText() const override {
        return "Point(" + std::to_string(x_) + ", " + std::to_string(y_) + ")";
    }
    std::string serialize() const override {
        return std::to_string(x_) + "," + std::to_string(y_);
    }
};

void show(const Printable& p) { std::cout << p.toText() << '\n'; }
void save(const Serializable& s) { std::cout << s.serialize() << '\n'; }

int main() {
    int x, y;
    std::cin >> x >> y;
    Point p(x, y);
    show(p);
    save(p);
}
```

```hint
`class Point : public Printable, public Serializable { ... };`. Note the `public` before **each** base.
```

```hint
Build the strings with `std::to_string(x_)`.
```

```stdin
3 4
```

```expected
Point(3, 4)
3,4
```

```stdin
-7 0
```

```expected hidden
Point(-7, 0)
-7,0
```

```checks
must class\s+Point\s*:\s*public\s+\w+\s*,\s*public\s+\w+ :: Point must publicly inherit from both interfaces.
must toText\s*\(\s*\)\s*const\s+override :: Override toText.
must serialize\s*\(\s*\)\s*const\s+override :: Override serialize.
```
:::

:::exercise Resolve the ambiguity
`Amphibian` inherits from both `Car` and `Boat`, which both have `describe()` and `topSpeed()`, so `main`
doesn't compile. Without changing `main`, `Car`, or `Boat`, add to `Amphibian`:

- `std::string describe() const` returning `amphibian: ` + `Car::describe()` + ` / ` + `Boat::describe()`,
- `int topSpeed() const` returning the **smaller** of the two base speeds (it's only as fast as its slower mode).

**Input:** the land speed and the water speed.
**Output:** the description, then `top speed: S`.

```cpp starter broken
#include <algorithm>
#include <iostream>
#include <string>

class Car {
    int speed_;
public:
    explicit Car(int s) : speed_(s) {}
    std::string describe() const { return "car at " + std::to_string(speed_) + " km/h"; }
    int topSpeed() const { return speed_; }
};

class Boat {
    int speed_;
public:
    explicit Boat(int s) : speed_(s) {}
    std::string describe() const { return "boat at " + std::to_string(speed_) + " km/h"; }
    int topSpeed() const { return speed_; }
};

class Amphibian : public Car, public Boat {
public:
    Amphibian(int land, int water) : Car(land), Boat(water) {}
};

int main() {
    int land, water;
    std::cin >> land >> water;
    Amphibian a(land, water);
    std::cout << a.describe() << '\n';
    std::cout << "top speed: " << a.topSpeed() << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <string>

class Car {
    int speed_;
public:
    explicit Car(int s) : speed_(s) {}
    std::string describe() const { return "car at " + std::to_string(speed_) + " km/h"; }
    int topSpeed() const { return speed_; }
};

class Boat {
    int speed_;
public:
    explicit Boat(int s) : speed_(s) {}
    std::string describe() const { return "boat at " + std::to_string(speed_) + " km/h"; }
    int topSpeed() const { return speed_; }
};

class Amphibian : public Car, public Boat {
public:
    Amphibian(int land, int water) : Car(land), Boat(water) {}
    std::string describe() const { return "amphibian: " + Car::describe() + " / " + Boat::describe(); }
    int topSpeed() const { return std::min(Car::topSpeed(), Boat::topSpeed()); }
};

int main() {
    int land, water;
    std::cin >> land >> water;
    Amphibian a(land, water);
    std::cout << a.describe() << '\n';
    std::cout << "top speed: " << a.topSpeed() << '\n';
}
```

```hint
Inside `Amphibian`, call each base's version explicitly with `Car::describe()` and `Boat::describe()`.
```

```hint
A function declared in `Amphibian` hides both base versions, so `a.describe()` is no longer ambiguous.
```

```stdin
120 40
```

```expected
amphibian: car at 120 km/h / boat at 40 km/h
top speed: 40
```

```stdin
10 25
```

```expected hidden
amphibian: car at 10 km/h / boat at 25 km/h
top speed: 10
```

```checks
must Car::describe\s*\(\s*\) :: Use Car::describe() in the combined description.
must Boat::describe\s*\(\s*\) :: Use Boat::describe() in the combined description.
must Car::topSpeed\s*\(\s*\) :: Use Car::topSpeed() to compute the combined speed.
```
:::

:::exercise One shared device
This copier is built from a `Scanner` and a `Printer`, which both inherit from `Device`. With ordinary
inheritance, a `Copier` contains **two** `Device`s, so the power-on message prints twice. Use **virtual
inheritance** so there is exactly one shared `Device`, initialized directly by `Copier`, and stop using
the `Scanner::` qualification for `id()` (it's no longer ambiguous).

**Input:** a device id, then a number of copies `n`.
**Output:** the construction messages, then `copy K of N on device ID` for each copy `K` from 1 to `n`.

```cpp starter
#include <iostream>

class Device {
    int id_;
public:
    explicit Device(int id) : id_(id) { std::cout << "Device " << id_ << " powered on\n"; }
    int id() const { return id_; }
};

class Scanner : public Device {
public:
    explicit Scanner(int id) : Device(id) { std::cout << "Scanner ready\n"; }
};

class Printer : public Device {
public:
    explicit Printer(int id) : Device(id) { std::cout << "Printer ready\n"; }
};

class Copier : public Scanner, public Printer {
public:
    explicit Copier(int id) : Scanner(id), Printer(id) { std::cout << "Copier ready\n"; }
    void copy(int k, int n) const {
        std::cout << "copy " << k << " of " << n << " on device " << Scanner::id() << '\n';
    }
};

int main() {
    int id, n;
    std::cin >> id >> n;
    Copier c(id);
    for (int k = 1; k <= n; ++k) c.copy(k, n);
}
```

```cpp solution
#include <iostream>

class Device {
    int id_;
public:
    explicit Device(int id) : id_(id) { std::cout << "Device " << id_ << " powered on\n"; }
    int id() const { return id_; }
};

class Scanner : virtual public Device {
public:
    explicit Scanner(int id) : Device(id) { std::cout << "Scanner ready\n"; }
};

class Printer : virtual public Device {
public:
    explicit Printer(int id) : Device(id) { std::cout << "Printer ready\n"; }
};

class Copier : public Scanner, public Printer {
public:
    explicit Copier(int id) : Device(id), Scanner(id), Printer(id) { std::cout << "Copier ready\n"; }
    void copy(int k, int n) const {
        std::cout << "copy " << k << " of " << n << " on device " << id() << '\n';
    }
};

int main() {
    int id, n;
    std::cin >> id >> n;
    Copier c(id);
    for (int k = 1; k <= n; ++k) c.copy(k, n);
}
```

```hint
Write `virtual public Device` in the base lists of **both** `Scanner` and `Printer`.
```

```hint
With a virtual base, the most-derived class must initialize it: `Copier(int id) : Device(id), Scanner(id), Printer(id)`. Since `Device` has no default constructor, leaving it out is a compile error.
```

```stdin
7 2
```

```expected
Device 7 powered on
Scanner ready
Printer ready
Copier ready
copy 1 of 2 on device 7
copy 2 of 2 on device 7
```

```stdin
100 0
```

```expected hidden
Device 100 powered on
Scanner ready
Printer ready
Copier ready
```

```checks
must class\s+Scanner\s*:\s*(virtual\s+public|public\s+virtual)\s+Device :: Scanner must inherit virtually from Device.
must class\s+Printer\s*:\s*(virtual\s+public|public\s+virtual)\s+Device :: Printer must inherit virtually from Device.
must Copier\s*\(\s*int\s+\w+\s*\)\s*:\s*Device\s*\( :: Copier must initialize the shared Device first in its initializer list.
mustnot Scanner::id :: With one shared Device, call id() directly.
```
:::
