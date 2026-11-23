---
title: Casting & RTTI
summary: Upcasting and downcasting, dynamic_cast with pointers and references, unchecked static_cast, typeid and type_info, plus const_cast and reinterpret_cast, so you know all four C++ casts.
---

## Upcasting: always safe, always implicit

Converting a pointer or reference from a **derived** class to a **base** class is called **upcasting**
(base classes are drawn on top in diagrams). Every `Dog` *is an* `Animal`, so it can't fail, and the
compiler does it automatically:

```cpp
Dog d;
Animal* p = &d;      // Dog* -> Animal*: implicit
Animal& r = d;       // Dog& -> Animal&: implicit
```

You've been doing this since the virtual functions lesson.

## Downcasting: needs a cast

Going the other way, from `Animal*` to `Dog*`, is **downcasting**. It can be wrong (the animal might be
a cat), so the compiler refuses to do it implicitly:

```cpp compile-error
class Animal { public: virtual ~Animal() = default; };
class Dog : public Animal { public: void fetch() {} };

int main() {
    Dog d;
    Animal* a = &d;
    Dog* p = a;      // error: invalid conversion from 'Animal*' to 'Dog*'
}
```

C++ gives you two ways to downcast: a **checked** one (`dynamic_cast`) and an **unchecked** one
(`static_cast`).

## `dynamic_cast`: checked at run time

`dynamic_cast<Target>(expression)` checks the object's **real** type at run time, using **RTTI**
(Run-Time Type Information), which the compiler stores alongside each class's vtable.

### With pointers: `nullptr` on failure

```cpp run
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Animal {
public:
    virtual ~Animal() = default;
    virtual std::string name() const = 0;
};

class Dog : public Animal {
public:
    std::string name() const override { return "dog"; }
    void fetch() const { std::cout << "  the dog fetches!\n"; }   // only dogs can fetch
};

class Cat : public Animal {
public:
    std::string name() const override { return "cat"; }
};

int main() {
    std::vector<std::unique_ptr<Animal>> pets;
    pets.push_back(std::make_unique<Dog>());
    pets.push_back(std::make_unique<Cat>());

    for (const auto& pet : pets) {
        std::cout << pet->name() << '\n';
        if (Dog* dog = dynamic_cast<Dog*>(pet.get())) {    // is it really a Dog?
            dog->fetch();
        }
    }
}
```

```output
dog
  the dog fetches!
cat
```

`dynamic_cast<Dog*>(p)` returns a valid `Dog*` if `p` points to a `Dog` (or to something derived from
`Dog`), and **`nullptr`** otherwise. Declaring the pointer inside the `if` condition is the idiomatic way
to write it: the pointer only exists where it's known to be valid. (`pet.get()` returns the raw pointer
a `unique_ptr` holds.)

### With references: throws `std::bad_cast`

A reference can't be null, so a failed `dynamic_cast` to a **reference** type throws an exception of type
`std::bad_cast` (from `<typeinfo>`). Exceptions get their own module later; for now, this is the shape of
the code that catches it:

```cpp run
#include <iostream>
#include <typeinfo>

class Animal { public: virtual ~Animal() = default; };
class Dog : public Animal { public: void fetch() const { std::cout << "fetch!\n"; } };
class Cat : public Animal {};

void play(const Animal& a) {
    try {
        const Dog& d = dynamic_cast<const Dog&>(a);   // throws if a isn't a Dog
        d.fetch();
    } catch (const std::bad_cast&) {
        std::cout << "not a dog\n";
    }
}

int main() {
    Dog d;
    Cat c;
    play(d);
    play(c);
}
```

```output
fetch!
not a dog
```

Use the pointer form when "not that type" is a normal possibility, and the reference form when it would
be a bug.

### Requirements and costs

- The source type must be **polymorphic** (have at least one virtual function), because RTTI lives
  with the vtable:

```cpp compile-error
struct Base {};                 // no virtual functions
struct Derived : Base {};

int main() {
    Base* b = new Derived;
    Derived* d = dynamic_cast<Derived*>(b);   // error: 'Base' is not polymorphic
}
```

- It costs a run-time type check (walking the class hierarchy), which is slower than a virtual call.
- It also handles **cross-casts** between sibling bases in multiple inheritance (next lessons).

## `static_cast`: unchecked downcast

`static_cast<Dog*>(animalPtr)` also downcasts, but checks **nothing at run time**. It just adjusts the
pointer as if the object were a `Dog`. If you're right, it's free. If you're wrong, using the result is
**undefined behavior**:

```cpp
Animal* a = new Cat;
Dog* d = static_cast<Dog*>(a);   // compiles, no check
d->fetch();                      // undefined behavior: it's a Cat
```

Use `static_cast` for downcasts only when the type is **guaranteed** by the program's logic (for
example, you just checked a type tag, or a design pattern ensures it). When in doubt, `dynamic_cast`.

`static_cast` is also the general-purpose cast for **well-defined conversions** between related types:
`static_cast<double>(n)`, `static_cast<int>(3.9)`, enum ↔ integer, `void*` → `T*`.

## `typeid` and `std::type_info`

The `typeid` operator (from `<typeinfo>`) returns a reference to a `std::type_info` object describing a
type. Applied to an expression of **polymorphic** type, it gives the **dynamic** type:

```cpp run
#include <iostream>
#include <typeinfo>

class Animal { public: virtual ~Animal() = default; };
class Dog : public Animal {};
class Cat : public Animal {};

int main() {
    Dog d;
    Animal& a = d;
    Animal* p = &d;

    std::cout << std::boolalpha;
    std::cout << (typeid(a) == typeid(Dog)) << '\n';      // dynamic type of a: Dog
    std::cout << (typeid(*p) == typeid(Dog)) << '\n';     // dereference: the object's type
    std::cout << (typeid(p) == typeid(Animal*)) << '\n';  // the POINTER's type is Animal*
    std::cout << (typeid(a) == typeid(Cat)) << '\n';
}
```

```output
true
true
true
false
```

Details to remember:

- `typeid(*p)` gives the object's dynamic type; `typeid(p)` gives the pointer's static type (a common
  mistake).
- On a **non-polymorphic** type, `typeid` gives the static type, decided at compile time.
- `typeid(*p)` where `p` is a null pointer to a polymorphic type throws `std::bad_typeid`.
- `typeid(a) == typeid(Dog)` is an *exact* match: a `Puppy` derived from `Dog` is not equal to `Dog`.
  `dynamic_cast<Dog*>` would accept the `Puppy`.

### `type_info::name()` is implementation-defined

`typeid(x).name()` returns a C-string naming the type, but its content is **up to the compiler**. GCC
returns a *mangled* name such as `3Dog`; MSVC returns `class Dog`. Fine for debugging, but never
compare it to a string or depend on it in output. To use types as keys in a map, use `std::type_index`
(from `<typeindex>`), which wraps a `type_info` and supports `<` and hashing.

## `const_cast`: adding or removing `const`

`const_cast` changes only `const` (and `volatile`) qualification. It's the only C++ cast that can remove
`const`. Two legitimate uses:

1. Calling an old C API that takes `char*` but promises not to modify it.
2. Implementing a non-const member function in terms of its const twin, to avoid duplicating code:

```cpp run
#include <iostream>
#include <vector>

class Library {
    std::vector<int> books_{101, 202, 303};
public:
    const int& find(int id) const {
        for (const int& b : books_)
            if (b == id) return b;
        return books_.front();
    }
    int& find(int id) {
        // call the const version, then remove const from the result:
        // safe, because *this is really non-const here
        return const_cast<int&>(static_cast<const Library&>(*this).find(id));
    }
};

int main() {
    Library lib;
    lib.find(202) = 999;        // non-const version
    const Library& view = lib;
    std::cout << view.find(999) << '\n';
}
```

```output
999
```

> **Warning:** Modifying an object that was **originally declared `const`** through a `const_cast` is
> undefined behavior. `const_cast` is only safe when the object itself was never const.

## `reinterpret_cast`: reinterpreting bits

`reinterpret_cast` converts between **unrelated** pointer types, or between pointers and integers,
reinterpreting the bits without any conversion or check:

```cpp
std::uintptr_t address = reinterpret_cast<std::uintptr_t>(&x);   // pointer -> integer
char* bytes = reinterpret_cast<char*>(&someStruct);              // view an object as raw bytes
```

It's for low-level code (hardware registers, serialization, OS interfaces). Accessing an object through
a pointer of an unrelated type is usually undefined behavior (the "strict aliasing" rule), with
exceptions for `char`, `unsigned char`, and `std::byte`. To reinterpret the bits of one value as another
type, C++20's **`std::bit_cast`** (from `<bit>`) is the safe tool:

```cpp run
#include <bit>
#include <cstdint>
#include <iostream>

int main() {
    float f = 1.0f;
    auto bits = std::bit_cast<std::uint32_t>(f);     // same bits, viewed as an integer
    std::cout << std::hex << bits << '\n';           // IEEE 754 encoding of 1.0
}
```

```output
3f800000
```

## The four casts, and C-style casts

| Cast | Does | Checked? | Use it for |
| --- | --- | --- | --- |
| `static_cast<T>(x)` | well-defined conversions, unchecked downcasts | compile time only | numeric conversions, downcasts you can guarantee |
| `dynamic_cast<T>(x)` | checked downcasts / cross-casts | **run time** | "is this really a `Dog`?" |
| `const_cast<T>(x)` | add or remove `const` | compile time | legacy APIs, const/non-const overload reuse |
| `reinterpret_cast<T>(x)` | reinterpret bits/pointers | none | low-level code only |

You'll also see **C-style casts** `(Dog*)p` and functional casts `int(x)`. A C-style cast tries
`const_cast`, `static_cast`, and `reinterpret_cast` (and combinations) until something compiles, so it
can silently remove `const` or reinterpret unrelated pointers. The named casts are explicit about
intent, easier to search for, and refuse dangerous combinations. **Prefer the named casts.**

## Downcasting is a design smell

If your code is full of `dynamic_cast` checks (`if it's a Dog do this, else if it's a Cat do that`),
you're doing polymorphism by hand. Each new subclass means finding and updating all those `if`s. Usually
a **virtual function** in the base class is the better design: ask the object to do the right thing
itself. Reserve downcasts for the cases where a capability genuinely belongs to only some types.

:::quiz
`Animal* a` points to a `Cat`. What does `dynamic_cast<Dog*>(a)` return?

- [ ] A `Dog*` pointing to the cat
- [x] `nullptr`
- [ ] It throws `std::bad_cast`
- [ ] It doesn't compile

A failed `dynamic_cast` to a pointer type yields `nullptr`. Only the reference form throws `std::bad_cast`.
:::

:::quiz
Which cast performs a check at run time?

- [ ] `static_cast`
- [x] `dynamic_cast`
- [ ] `const_cast`
- [ ] `reinterpret_cast`

Only `dynamic_cast` consults RTTI at run time. The others are resolved entirely at compile time.
:::

:::quiz
`Animal* p = new Dog;` (with `Animal` polymorphic). Which expressions are `true`? (select all that apply)

- [x] `typeid(*p) == typeid(Dog)`
- [ ] `typeid(p) == typeid(Dog*)`
- [x] `typeid(p) == typeid(Animal*)`
- [ ] `typeid(*p) == typeid(Animal)`

`typeid` of the dereferenced object gives the dynamic type (`Dog`); `typeid` of the pointer itself is
its static type (`Animal*`).
:::

:::exercise Find the dogs {easy}
Only `Dog` has a `fetch()` member. For every animal, print its name; if the animal is **really a dog**
(check with `dynamic_cast`), also call `fetch()`. At the end, print how many of the animals were dogs.

**Input:** lines until end of input, each `dog NAME`, `puppy NAME`, `cat NAME`, or `bird NAME`. A
`Puppy` derives from `Dog`, so a puppy **is** a dog too.
**Output:** for each animal a line `NAME`, followed for dogs (puppies included) by `NAME fetches!`. Then
`dogs: D of N`.

```cpp starter
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Animal {
    std::string name_;
public:
    explicit Animal(std::string n) : name_(std::move(n)) {}
    virtual ~Animal() = default;
    const std::string& name() const { return name_; }
};

class Dog : public Animal {
public:
    using Animal::Animal;
    void fetch() const { std::cout << name() << " fetches!\n"; }
};

class Puppy : public Dog { public: using Dog::Dog; };
class Cat : public Animal { public: using Animal::Animal; };
class Bird : public Animal { public: using Animal::Animal; };

int main() {
    std::vector<std::unique_ptr<Animal>> zoo;
    std::string kind, name;
    while (std::cin >> kind >> name) {
        if (kind == "dog") zoo.push_back(std::make_unique<Dog>(name));
        else if (kind == "puppy") zoo.push_back(std::make_unique<Puppy>(name));
        else if (kind == "cat") zoo.push_back(std::make_unique<Cat>(name));
        else zoo.push_back(std::make_unique<Bird>(name));
    }
    int dogs = 0;
    for (const auto& a : zoo) {
        std::cout << a->name() << '\n';
        // if it's a dog: call fetch() and count it
    }
    std::cout << "dogs: " << dogs << " of " << zoo.size() << '\n';
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Animal {
    std::string name_;
public:
    explicit Animal(std::string n) : name_(std::move(n)) {}
    virtual ~Animal() = default;
    const std::string& name() const { return name_; }
};

class Dog : public Animal {
public:
    using Animal::Animal;
    void fetch() const { std::cout << name() << " fetches!\n"; }
};

class Puppy : public Dog { public: using Dog::Dog; };
class Cat : public Animal { public: using Animal::Animal; };
class Bird : public Animal { public: using Animal::Animal; };

int main() {
    std::vector<std::unique_ptr<Animal>> zoo;
    std::string kind, name;
    while (std::cin >> kind >> name) {
        if (kind == "dog") zoo.push_back(std::make_unique<Dog>(name));
        else if (kind == "puppy") zoo.push_back(std::make_unique<Puppy>(name));
        else if (kind == "cat") zoo.push_back(std::make_unique<Cat>(name));
        else zoo.push_back(std::make_unique<Bird>(name));
    }
    int dogs = 0;
    for (const auto& a : zoo) {
        std::cout << a->name() << '\n';
        if (const Dog* d = dynamic_cast<const Dog*>(a.get())) {
            d->fetch();
            ++dogs;
        }
    }
    std::cout << "dogs: " << dogs << " of " << zoo.size() << '\n';
}
```

```hint
`a.get()` gives the raw `Animal*`. Then `if (const Dog* d = dynamic_cast<const Dog*>(a.get())) { ... }`.
```

```hint
Comparing `typeid(*a) == typeid(Dog)` is an *exact* match, so it misses puppies. `dynamic_cast` accepts
anything that is-a `Dog`.
```

```stdin
dog Rex
cat Tom
dog Fido
bird Tweety
```

```expected
Rex
Rex fetches!
Tom
Fido
Fido fetches!
Tweety
dogs: 2 of 4
```

```stdin
cat Solo
```

```expected hidden
Solo
dogs: 0 of 1
```

```stdin
puppy Bit
cat Tom
dog Rex
puppy Byte
```

```expected hidden
Bit
Bit fetches!
Tom
Rex
Rex fetches!
Byte
Byte fetches!
dogs: 3 of 4
```

```checks
must dynamic_cast\s*<\s*(const\s+)?Dog\s*\* :: Use dynamic_cast to Dog* to check the real type.
mustnot static_cast\s*<\s*(const\s+)?Dog :: static_cast doesn't check; use dynamic_cast.
mustnot typeid :: typeid only matches the exact type; use dynamic_cast so puppies count as dogs.
```
:::

:::exercise Checked reference cast {easy}
Write `void inspect(const Shape& s)` that uses `dynamic_cast` to a **reference** `const Square&`:

- If it succeeds, print `square with side X`.
- If it throws `std::bad_cast`, catch it and print `not a square (NAME)`, using the shape's virtual `name()`.

**Input:** lines until end of input: `square SIDE` or `circle RADIUS` (integers).
**Output:** one line per shape from `inspect`.

```cpp starter
#include <iostream>
#include <string>
#include <typeinfo>

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::string name() const = 0;
};

class Square : public Shape {
    int side_;
public:
    explicit Square(int s) : side_(s) {}
    int side() const { return side_; }
    std::string name() const override { return "square"; }
};

class Circle : public Shape {
    int r_;
public:
    explicit Circle(int r) : r_(r) {}
    std::string name() const override { return "circle"; }
};

void inspect(const Shape& s) {
    std::cout << s.name() << '\n';   // replace with the dynamic_cast logic
}

int main() {
    std::string kind;
    int value;
    while (std::cin >> kind >> value) {
        if (kind == "square") inspect(Square(value));
        else inspect(Circle(value));
    }
}
```

```cpp solution
#include <iostream>
#include <string>
#include <typeinfo>

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::string name() const = 0;
};

class Square : public Shape {
    int side_;
public:
    explicit Square(int s) : side_(s) {}
    int side() const { return side_; }
    std::string name() const override { return "square"; }
};

class Circle : public Shape {
    int r_;
public:
    explicit Circle(int r) : r_(r) {}
    std::string name() const override { return "circle"; }
};

void inspect(const Shape& s) {
    try {
        const Square& sq = dynamic_cast<const Square&>(s);
        std::cout << "square with side " << sq.side() << '\n';
    } catch (const std::bad_cast&) {
        std::cout << "not a square (" << s.name() << ")\n";
    }
}

int main() {
    std::string kind;
    int value;
    while (std::cin >> kind >> value) {
        if (kind == "square") inspect(Square(value));
        else inspect(Circle(value));
    }
}
```

```hint
`try { const Square& sq = dynamic_cast<const Square&>(s); ... } catch (const std::bad_cast&) { ... }`
```

```stdin
square 4
circle 2
```

```expected
square with side 4
not a square (circle)
```

```stdin
circle 0
circle 1
square 0
```

```expected hidden
not a square (circle)
not a square (circle)
square with side 0
```

```checks
must dynamic_cast\s*<\s*const\s+Square\s*& :: Cast to a reference: dynamic_cast<const Square&>.
must catch\s*\(\s*(const\s+)?std::bad_cast :: Catch std::bad_cast.
```
:::

:::exercise Same type? {medium}
A factory creates shapes from names. For each pair of names, create both shapes and report whether
they have **exactly the same dynamic type**, using `typeid` on the objects (not on the pointers, and not
by comparing names or strings).

Note that `Cube` derives from `Square`: a cube and a square are **different** types.

**Input:** pairs of names until end of input; each name is `circle`, `square`, or `cube`.
**Output:** `same` or `different` for each pair.

```cpp starter
#include <iostream>
#include <memory>
#include <string>
#include <typeinfo>

class Shape { public: virtual ~Shape() = default; };
class Circle : public Shape {};
class Square : public Shape {};
class Cube : public Square {};

std::unique_ptr<Shape> make(const std::string& name) {
    if (name == "circle") return std::make_unique<Circle>();
    if (name == "cube") return std::make_unique<Cube>();
    return std::make_unique<Square>();
}

int main() {
    std::string x, y;
    while (std::cin >> x >> y) {
        std::unique_ptr<Shape> a = make(x);
        std::unique_ptr<Shape> b = make(y);
        bool same = false;   // compare the dynamic types with typeid
        std::cout << (same ? "same" : "different") << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <typeinfo>

class Shape { public: virtual ~Shape() = default; };
class Circle : public Shape {};
class Square : public Shape {};
class Cube : public Square {};

std::unique_ptr<Shape> make(const std::string& name) {
    if (name == "circle") return std::make_unique<Circle>();
    if (name == "cube") return std::make_unique<Cube>();
    return std::make_unique<Square>();
}

int main() {
    std::string x, y;
    while (std::cin >> x >> y) {
        std::unique_ptr<Shape> a = make(x);
        std::unique_ptr<Shape> b = make(y);
        bool same = typeid(*a) == typeid(*b);
        std::cout << (same ? "same" : "different") << '\n';
    }
}
```

```hint
Dereference the smart pointers so `typeid` sees the objects: `typeid(*a) == typeid(*b)`.
```

```hint
`typeid(a) == typeid(b)` compares the types of the two `unique_ptr<Shape>` variables, which are always the same.
```

```stdin
circle circle
circle square
square cube
cube cube
```

```expected
same
different
different
same
```

```stdin
square square
```

```expected hidden
same
```

```checks
must typeid\s*\(\s*\*\s*\w+\s*\) :: Use typeid on the dereferenced objects, e.g. typeid(*a).
mustnot \bx\s*==\s*y\b :: Compare the objects' types, not the input strings.
mustnot \.name\s*\( :: Don't compare type_info::name(); its text is implementation-defined.
```
:::

:::exercise Collision checker {hard}
A virtual function dispatches on the type of **one** object. Collision tests depend on the types of
**two**: point vs circle, circle vs rectangle, and so on. This is one of the few places where
downcasting is a reasonable design. Write `bool hit(const Shape& a, const Shape& b)` that finds out
both dynamic types with `dynamic_cast` and calls the right geometric test.

Shapes (all coordinates are integers, use exact integer arithmetic):

- `point NAME X Y`
- `circle NAME X Y R` (centre and radius, `R >= 0`)
- `rect NAME X1 Y1 X2 Y2`: an axis-aligned rectangle given by two opposite corners, in **any** order.

Two shapes **hit** if they share at least one point; touching edges count. (Point–point: same
coordinates. Point–circle: distance to the centre ≤ R. Circle–circle: distance between centres ≤ R1 + R2.
Rect–rect: the x ranges and the y ranges both overlap. Point–rect: inside or on the border.
Circle–rect: the point of the rectangle **nearest** to the centre is within R.) Compare squared
distances so you never need a square root.

**Input:** commands until end of input: the three shape commands (defining a name again replaces the
old shape), and `hit A B`.
**Output:** for each `hit`, `KINDA/KINDB: hit` or `KINDA/KINDB: miss` (kinds are `point`, `circle`,
`rect`, in the order the names were given), or `error: no NAME` for the first name that doesn't exist.

**Constraints:** coordinates and radii are at most 10⁶ in absolute value.

```cpp starter
#include <iostream>
#include <map>
#include <memory>
#include <string>

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::string kind() const = 0;
};

// write Point, Circle, Rect and hit() here

int main() {
    // read commands until end of input
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <map>
#include <memory>
#include <string>

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::string kind() const = 0;
};

class Point : public Shape {
public:
    long long x, y;
    Point(long long x_, long long y_) : x(x_), y(y_) {}
    std::string kind() const override { return "point"; }
};

class Circle : public Shape {
public:
    long long x, y, r;
    Circle(long long x_, long long y_, long long r_) : x(x_), y(y_), r(r_) {}
    std::string kind() const override { return "circle"; }
};

class Rect : public Shape {
public:
    long long x1, y1, x2, y2;
    Rect(long long a, long long b, long long c, long long d)
        : x1(std::min(a, c)), y1(std::min(b, d)), x2(std::max(a, c)), y2(std::max(b, d)) {}
    std::string kind() const override { return "rect"; }
};

long long sq(long long v) { return v * v; }

bool hitPointCircle(const Point& p, const Circle& c) { return sq(p.x - c.x) + sq(p.y - c.y) <= sq(c.r); }
bool hitPointRect(const Point& p, const Rect& r) { return r.x1 <= p.x && p.x <= r.x2 && r.y1 <= p.y && p.y <= r.y2; }
bool hitCircleRect(const Circle& c, const Rect& r) {
    long long nx = std::clamp(c.x, r.x1, r.x2), ny = std::clamp(c.y, r.y1, r.y2);   // nearest point of r
    return sq(c.x - nx) + sq(c.y - ny) <= sq(c.r);
}

bool hit(const Shape& a, const Shape& b) {
    // Put the pair in a canonical order: point < circle < rect.
    if (auto p = dynamic_cast<const Point*>(&a)) {
        if (auto q = dynamic_cast<const Point*>(&b)) return p->x == q->x && p->y == q->y;
        if (auto c = dynamic_cast<const Circle*>(&b)) return hitPointCircle(*p, *c);
        if (auto r = dynamic_cast<const Rect*>(&b)) return hitPointRect(*p, *r);
    }
    if (auto c = dynamic_cast<const Circle*>(&a)) {
        if (dynamic_cast<const Point*>(&b)) return hit(b, a);
        if (auto d = dynamic_cast<const Circle*>(&b)) return sq(c->x - d->x) + sq(c->y - d->y) <= sq(c->r + d->r);
        if (auto r = dynamic_cast<const Rect*>(&b)) return hitCircleRect(*c, *r);
    }
    if (auto r = dynamic_cast<const Rect*>(&a)) {
        if (auto s = dynamic_cast<const Rect*>(&b))
            return r->x1 <= s->x2 && s->x1 <= r->x2 && r->y1 <= s->y2 && s->y1 <= r->y2;
        return hit(b, a);
    }
    return false;
}

int main() {
    std::map<std::string, std::unique_ptr<Shape>> shapes;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "hit") {
            std::string a, b;
            std::cin >> a >> b;
            if (!shapes.count(a)) std::cout << "error: no " << a << '\n';
            else if (!shapes.count(b)) std::cout << "error: no " << b << '\n';
            else std::cout << shapes[a]->kind() << '/' << shapes[b]->kind() << ": "
                           << (hit(*shapes[a], *shapes[b]) ? "hit" : "miss") << '\n';
            continue;
        }
        std::string name;
        std::cin >> name;
        long long v[4] = {};
        int n = cmd == "point" ? 2 : cmd == "circle" ? 3 : 4;
        for (int i = 0; i < n; ++i) std::cin >> v[i];
        if (cmd == "point") shapes[name] = std::make_unique<Point>(v[0], v[1]);
        else if (cmd == "circle") shapes[name] = std::make_unique<Circle>(v[0], v[1], v[2]);
        else shapes[name] = std::make_unique<Rect>(v[0], v[1], v[2], v[3]);
    }
}
```

```hint
Avoid writing all nine combinations: handle each unordered pair once, and when the arguments arrive in
the "wrong" order (say a rect and then a point), just return `hit(b, a)`. `if (auto c =
dynamic_cast<const Circle*>(&a)) { ... }` both tests the type and gives you a usable pointer.
```

```hint
For circle–rectangle, clamp the centre into the rectangle (`std::clamp(cx, x1, x2)` from `<algorithm>`
and the same for y) to get the nearest point, then compare its squared distance with `R * R`. Checking
only the bounding box of the circle is wrong near the corners. Normalize the rectangle's corners in its
constructor with `std::min` / `std::max`.
```

```stdin
circle c 0 0 5
rect r 3 4 10 10
point p 3 4
hit c r
hit p c
hit r p
hit p zz
```

```expected
circle/rect: hit
point/circle: hit
rect/point: hit
error: no zz
```

```stdin
circle c 0 0 5
rect corner 4 4 10 10
hit c corner
hit corner c
rect touch 5 -3 9 3
hit touch c
rect far 10 10 -10 6
hit far c
hit c far
point p 3 4
point q 4 3
hit p q
point q 3 4
hit q p
hit q nope
hit nope q
```

```expected hidden
circle/rect: miss
rect/circle: miss
rect/circle: hit
rect/circle: miss
circle/rect: miss
point/point: miss
point/point: hit
error: no nope
error: no nope
```

```stdin
rect a 0 0 4 4
rect b 4 4 8 8
rect c 5 0 9 3
hit a b
hit a c
hit c b
circle in 2 2 1
hit in a
circle big 0 0 100
hit a big
circle u 0 10 4
circle v 0 2 4
hit u v
circle v 0 1 4
hit u v
circle dot 7 7 0
hit dot b
point e 1000000 -1000000
circle huge -1000000 1000000 2828427
hit e huge
circle huge -1000000 1000000 2828428
hit huge e
```

```expected hidden
rect/rect: hit
rect/rect: miss
rect/rect: miss
circle/rect: hit
rect/circle: hit
circle/circle: hit
circle/circle: miss
circle/rect: hit
point/circle: miss
circle/point: hit
```

```checks
must dynamic_cast\s*<\s*(const\s+)?\w+\s*\* :: Find out the dynamic types with dynamic_cast.
must bool\s+hit\s*\(\s*const\s+Shape\s*& :: Write bool hit(const Shape&, const Shape&).
```
:::
