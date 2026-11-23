---
title: Virtual Destructors
summary: Why deleting a derived object through a base pointer requires a virtual destructor, and the rule every polymorphic base class must follow.
---

## The bug

Polymorphism means handling derived objects through base pointers, and that includes **deleting**
them through base pointers. Consider this, where `Base` has a normal (non-virtual) destructor:

```cpp
class Base {
public:
    virtual void work() {}
    ~Base() { std::cout << "~Base\n"; }           // NOT virtual
};

class Derived : public Base {
    int* buffer_ = new int[1000];
public:
    ~Derived() { delete[] buffer_; std::cout << "~Derived\n"; }
};

int main() {
    Base* p = new Derived;
    delete p;      // undefined behavior!
}
```

The destructor is a member function like any other. If it's not virtual, `delete p` is **statically
bound**: it calls the destructor for `p`'s static type, `Base`. According to the C++ standard, deleting
a derived object through a base pointer whose destructor isn't virtual is **undefined behavior**. In
practice what usually happens is that only `~Base` runs: `~Derived` never executes, so `buffer_` leaks,
and any members of `Derived` (strings, vectors, files) are never destroyed either. On other compilers
or with other class layouts it can corrupt the heap.

GCC catches the simple cases with `-Wall`:

```
warning: deleting object of polymorphic class type 'Base' which has non-virtual destructor
might cause undefined behavior [-Wdelete-non-virtual-dtor]
```

## The fix: `virtual ~Base()`

Make the base destructor **virtual**. Then `delete p` dispatches through the vtable to the **most
derived** destructor, which (as always) runs its body and then automatically calls the destructors of its
members and bases, all the way up:

```cpp run
#include <iostream>

class Base {
public:
    virtual ~Base() { std::cout << "~Base\n"; }    // virtual
    virtual void work() {}
};

class Middle : public Base {
public:
    ~Middle() override { std::cout << "~Middle\n"; }   // 'override' on destructors is optional
};

class Leaf : public Middle {
    int* buffer_ = new int[1000];
public:
    ~Leaf() { delete[] buffer_; std::cout << "~Leaf (buffer freed)\n"; }   // automatically virtual
};

int main() {
    Base* p = new Leaf;
    delete p;                 // ~Leaf, ~Middle, ~Base: the whole object is cleaned up
}
```

```output
~Leaf (buffer freed)
~Middle
~Base
```

Once a base destructor is virtual, every derived destructor is virtual too, whether or not you write
`virtual` or `override` on it.

The same applies to smart pointers. A `std::unique_ptr<Base>` calls `delete` on a `Base*`, so a
`std::vector<std::unique_ptr<Shape>>` (from the last lesson) is only correct because `Shape` had
`virtual ~Shape() = default;`:

```cpp run
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;              // the one essential line
    virtual std::string name() const = 0;
};

class Polygon : public Shape {
    std::vector<int> points_{1, 2, 3, 4};    // a member that must be destroyed properly
public:
    ~Polygon() override { std::cout << "Polygon with " << points_.size() << " points destroyed\n"; }
    std::string name() const override { return "polygon"; }
};

int main() {
    std::unique_ptr<Shape> s = std::make_unique<Polygon>();
    std::cout << s->name() << '\n';
}                                            // unique_ptr deletes through Shape*: virtual dtor needed
```

```output
polygon
Polygon with 4 points destroyed
```

> **Note:** `std::shared_ptr` is a special case: `std::shared_ptr<Base> p = std::make_shared<Derived>();`
> remembers how to delete a `Derived` even without a virtual destructor. Don't rely on it: the next
> person may hold the same object in a `unique_ptr` or delete a raw pointer.

## The rule

> **A base class destructor should be either `public` and `virtual`, or `protected` and non-virtual.**

- **Public and virtual**: for polymorphic bases, whose derived objects may be deleted through a base
  pointer. If a class has *any* virtual function, it's meant to be used polymorphically, so give it a
  virtual destructor. Writing `virtual ~Base() = default;` costs nothing extra once the class already
  has a vtable.
- **Protected and non-virtual**: for bases that should **never** be deleted through a base pointer
  (for example, small "mixin" helpers). Then `delete basePtr` doesn't even compile:

```cpp compile-error
class Countable {                 // a helper base, not meant for polymorphic deletion
protected:
    ~Countable() = default;       // protected: only derived classes can destroy a Countable
public:
    int count = 0;
};

class Item : public Countable {};

int main() {
    Item item;                    // fine: Item's destructor can call the protected ~Countable
    Countable* p = new Item;
    delete p;                     // error: '~Countable()' is protected within this context
}
```

When you **don't** need a virtual destructor:

- Classes that aren't designed to be inherited from at all (most value types: `Point`, `Money`). Mark
  them `final` if you want the compiler to enforce it.
- Classes used as bases but never deleted through the base (then use the protected non-virtual form).

> **Warning:** Standard library types like `std::string`, `std::vector`, and `std::map` have
> **non-virtual** public destructors. Don't publicly inherit from them and then delete through a pointer
> to the standard type. Prefer composition.

## Virtual destructors and the rule of five

Declaring a destructor, even `virtual ~Base() = default;`, **suppresses the implicit move operations**
(you saw this in the Move Semantics lesson). For a polymorphic base, that's usually fine, because such
objects are handled through pointers and rarely copied or moved by value. If you need them, default
them explicitly:

```cpp
class Base {
public:
    Base() = default;
    virtual ~Base() = default;
    Base(const Base&) = default;
    Base& operator=(const Base&) = default;
    Base(Base&&) = default;
    Base& operator=(Base&&) = default;
};
```

Many polymorphic bases go the other way and **delete** the copy operations to prevent slicing, as
you'll see in the "Object Slicing" lesson.

:::quiz
`Base` has virtual functions but a non-virtual public destructor. What does `Base* p = new Derived; delete p;` do?

- [ ] Runs `~Derived` then `~Base`, correctly
- [ ] Doesn't compile
- [x] Undefined behavior (typically only `~Base` runs, leaking `Derived`'s resources)
- [ ] Runs only `~Derived`

Without a virtual destructor, deleting through a base pointer is undefined behavior. GCC warns with
`-Wdelete-non-virtual-dtor`.
:::

:::quiz
`Shape` has `virtual ~Shape() = default;`. Which destructors run, in order, when a `std::unique_ptr<Shape>` owning a `Circle` (derived from `Shape`) is destroyed?

- [ ] Only `~Shape`
- [ ] `~Shape`, then `~Circle`
- [x] `~Circle`, then `~Shape`
- [ ] Only `~Circle`

The virtual call reaches `~Circle` first; after its body (and its members) are done, the base part is
destroyed. Destruction always goes from most derived to base.
:::

:::exercise Clean shutdown {easy}
`Resource` is a polymorphic base, but its destructor isn't virtual, so when `main` destroys the
resources through `std::unique_ptr<Resource>`, the derived destructors never run. Fix the base class
so cleanup is complete. (GCC also warns about this in the starter: read the warning!)

**Input:** lines until end of input, each `file NAME` or `socket NAME`.
**Output:** the `open`/`connect` lines as resources are created, then `shutting down`, then for each
resource in input order its derived cleanup line followed by `release NAME`.

```cpp starter
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Resource {
protected:
    std::string name_;
public:
    explicit Resource(std::string name) : name_(std::move(name)) {}
    ~Resource() { std::cout << "release " << name_ << '\n'; }
    virtual std::string kind() const = 0;
};

class File : public Resource {
public:
    explicit File(std::string name) : Resource(std::move(name)) { std::cout << "open " << name_ << '\n'; }
    ~File() { std::cout << "close file " << name_ << '\n'; }
    std::string kind() const override { return "file"; }
};

class Socket : public Resource {
public:
    explicit Socket(std::string name) : Resource(std::move(name)) { std::cout << "connect " << name_ << '\n'; }
    ~Socket() { std::cout << "disconnect " << name_ << '\n'; }
    std::string kind() const override { return "socket"; }
};

int main() {
    std::vector<std::unique_ptr<Resource>> resources;
    std::string kind, name;
    while (std::cin >> kind >> name) {
        if (kind == "file") resources.push_back(std::make_unique<File>(name));
        else resources.push_back(std::make_unique<Socket>(name));
    }
    std::cout << "shutting down\n";
    for (auto& r : resources) r.reset();     // destroy each, in order
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Resource {
protected:
    std::string name_;
public:
    explicit Resource(std::string name) : name_(std::move(name)) {}
    virtual ~Resource() { std::cout << "release " << name_ << '\n'; }
    virtual std::string kind() const = 0;
};

class File : public Resource {
public:
    explicit File(std::string name) : Resource(std::move(name)) { std::cout << "open " << name_ << '\n'; }
    ~File() override { std::cout << "close file " << name_ << '\n'; }
    std::string kind() const override { return "file"; }
};

class Socket : public Resource {
public:
    explicit Socket(std::string name) : Resource(std::move(name)) { std::cout << "connect " << name_ << '\n'; }
    ~Socket() override { std::cout << "disconnect " << name_ << '\n'; }
    std::string kind() const override { return "socket"; }
};

int main() {
    std::vector<std::unique_ptr<Resource>> resources;
    std::string kind, name;
    while (std::cin >> kind >> name) {
        if (kind == "file") resources.push_back(std::make_unique<File>(name));
        else resources.push_back(std::make_unique<Socket>(name));
    }
    std::cout << "shutting down\n";
    for (auto& r : resources) r.reset();
}
```

```hint
One keyword in front of `~Resource()` fixes it.
```

```stdin
file log.txt
socket db
```

```expected
open log.txt
connect db
shutting down
close file log.txt
release log.txt
disconnect db
release db
```

```stdin
socket a
socket b
file c
```

```expected hidden
connect a
connect b
open c
shutting down
disconnect a
release a
disconnect b
release b
close file c
release c
```

```checks
must virtual\s*~\s*Resource :: Make ~Resource() virtual.
```
:::

:::exercise Leak detector {medium}
Each `BufferPlugin` allocates `n` ints in its constructor and frees them in its destructor, keeping a
global count of how many ints are currently allocated. Write the abstract base `Plugin` so that deleting
plugins through `Plugin*` frees everything:

- a **public virtual destructor** (`= default` is fine),
- a pure virtual `std::size_t size() const`.

Then write `BufferPlugin` (its constructor and destructor update `g_allocated`, the global counter).

**Input:** `n` sizes until end of input.
**Output:** `allocated: A` after creating all plugins (the sum of the sizes), then `leaked: L` after
deleting them all through the base pointers (should be 0).

```cpp starter
#include <cstddef>
#include <iostream>
#include <vector>

std::size_t g_allocated = 0;

class Plugin {
public:
    // TODO: virtual destructor and pure virtual size()
};

class BufferPlugin : public Plugin {
    // TODO: own a heap array of ints
public:
    explicit BufferPlugin(std::size_t) {}
};

int main() {
    std::vector<Plugin*> plugins;      // raw owning pointers, on purpose for this exercise
    std::size_t n;
    while (std::cin >> n) plugins.push_back(new BufferPlugin(n));
    std::cout << "allocated: " << g_allocated << '\n';
    for (Plugin* p : plugins) delete p;
    std::cout << "leaked: " << g_allocated << '\n';
}
```

```cpp solution
#include <cstddef>
#include <iostream>
#include <vector>

std::size_t g_allocated = 0;

class Plugin {
public:
    virtual ~Plugin() = default;
    virtual std::size_t size() const = 0;
};

class BufferPlugin : public Plugin {
    int* data_;
    std::size_t size_;
public:
    explicit BufferPlugin(std::size_t n) : data_(new int[n]{}), size_(n) { g_allocated += size_; }
    ~BufferPlugin() override {
        delete[] data_;
        g_allocated -= size_;
    }
    BufferPlugin(const BufferPlugin&) = delete;
    BufferPlugin& operator=(const BufferPlugin&) = delete;
    std::size_t size() const override { return size_; }
};

int main() {
    std::vector<Plugin*> plugins;
    std::size_t n;
    while (std::cin >> n) plugins.push_back(new BufferPlugin(n));
    std::cout << "allocated: " << g_allocated << '\n';
    for (Plugin* p : plugins) delete p;
    std::cout << "leaked: " << g_allocated << '\n';
}
```

```hint
`Plugin` needs `virtual ~Plugin() = default;` and `virtual std::size_t size() const = 0;`.
```

```hint
`BufferPlugin`: members `int* data_;` and `std::size_t size_;`. Constructor: allocate with `new int[n]{}` and add `n` to `g_allocated`. Destructor: `delete[] data_;` and subtract.
```

```stdin
100 250 50
```

```expected
allocated: 400
leaked: 0
```

```stdin
1
```

```expected hidden
allocated: 1
leaked: 0
```

```checks
must virtual\s*~\s*Plugin :: Give Plugin a virtual destructor.
must size\s*\(\s*\)\s*const\s*=\s*0 :: Make size() pure virtual.
must delete\s*\[\s*\] :: Free the buffer with delete[] in BufferPlugin's destructor.
```
:::

:::exercise Three-level teardown {easy}
Write a three-level hierarchy, `Base` → `Middle` → `Leaf`, where each destructor prints `~Base`,
`~Middle`, or `~Leaf` (followed by a space, no newline). Make sure deleting through a
`std::unique_ptr<Base>` runs **every** destructor that belongs to the object.

**Input:** lines until end of input, each `base`, `middle`, or `leaf`.
**Output:** for each line, create that type through `std::unique_ptr<Base>`, destroy it, and end the
line. For example a `leaf` produces `~Leaf ~Middle ~Base`.

```cpp starter
#include <iostream>
#include <memory>
#include <string>

class Base {
public:
    ~Base() { std::cout << "~Base "; }
    virtual void hello() const {}
};

// write Middle and Leaf

int main() {
    std::string kind;
    while (std::cin >> kind) {
        std::unique_ptr<Base> p = std::make_unique<Base>();   // create the right type
        p.reset();
        std::cout << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>

class Base {
public:
    virtual ~Base() { std::cout << "~Base "; }
    virtual void hello() const {}
};

class Middle : public Base {
public:
    ~Middle() override { std::cout << "~Middle "; }
};

class Leaf : public Middle {
public:
    ~Leaf() override { std::cout << "~Leaf "; }
};

int main() {
    std::string kind;
    while (std::cin >> kind) {
        std::unique_ptr<Base> p;
        if (kind == "leaf") p = std::make_unique<Leaf>();
        else if (kind == "middle") p = std::make_unique<Middle>();
        else p = std::make_unique<Base>();
        p.reset();
        std::cout << '\n';
    }
}
```

```hint
Only `Base`'s destructor needs the `virtual` keyword; the derived ones become virtual automatically.
```

```hint
Declare `std::unique_ptr<Base> p;` and assign `std::make_unique<Leaf>()` etc. depending on the word.
```

```stdin
leaf
middle
base
```

```expected
~Leaf ~Middle ~Base
~Middle ~Base
~Base
```

```stdin
leaf
leaf
```

```expected hidden
~Leaf ~Middle ~Base
~Leaf ~Middle ~Base
```

```checks
must virtual\s*~\s*Base :: Make ~Base() virtual.
must class\s+Leaf\s*:\s*public\s+Middle :: Leaf should derive from Middle.
must class\s+Middle\s*:\s*public\s+Base :: Middle should derive from Base.
```
:::
