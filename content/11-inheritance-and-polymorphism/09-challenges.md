---
title: "Inheritance & Polymorphism: Challenges"
summary: Four hard design problems built on class hierarchies, from an expression tree with a virtual eval() to an event dispatcher and a file system, plus two predict-the-output quizzes on virtual calls and slicing.
---

These problems are meant to be **hard**. Each one is a small real program: the input and output are
specified exactly, but the class hierarchy is yours to design. They combine this module's ideas
(inheritance, virtual and pure virtual functions, virtual destructors, `dynamic_cast`, avoiding
slicing) with everything from the Classes module and earlier: RAII, `std::unique_ptr`, containers,
operator overloading.

Try each one properly before opening a hint, and resist reading the solution until your own version
passes, or until you've really been stuck for a while. The hidden tests go after the edge cases.

## Quiz: who answers the call?

:::quiz
What does this program print?

```cpp
struct Base {
    Base() { hello(); }
    virtual ~Base() { hello(); }
    virtual void hello() const { std::cout << 'B'; }
    void greet() const { hello(); }
};

struct Derived : Base {
    Derived() { hello(); }
    ~Derived() override { hello(); }
    void hello() const override { std::cout << 'D'; }
};

int main() {
    Derived d;
    d.greet();
}
```

- [ ] `DDDDD`
- [x] `BDDDB`
- [ ] `BDDBB`
- [ ] `BDDD`

While `Base`'s constructor runs, the object is still only a `Base`, so `hello()` is `Base::hello`
(`B`). Then `Derived`'s constructor body prints `D`, and `greet()` dispatches dynamically (`D`). On
destruction `~Derived` runs first (`D`); by the time `~Base` runs, the `Derived` part is gone, so the
call resolves to `Base::hello` again (`B`).
:::

:::quiz
What does this program print?

```cpp
struct A {
    virtual char id() const { return 'A'; }
    virtual ~A() { std::cout << "~A"; }
};

struct B : A {
    char id() const override { return 'B'; }
    ~B() override { std::cout << "~B"; }
};

void show(A a) { std::cout << a.id(); }

int main() {
    B b;
    show(b);
    std::cout << b.id();
}
```

- [ ] `B~B~AB~B~A`
- [ ] `AB~B~A`
- [x] `A~AB~B~A`
- [ ] `A~B~AB~B~A`

`show` takes an `A` **by value**, so its parameter is a sliced copy: a real `A`, printing `A`, and
destroyed (as an `A`, `~A`) when `show` returns. `b.id()` prints `B`. At the end of `main`, `b` is
destroyed as a full `B`: `~B` then `~A`.
:::

## Problems

:::exercise Shape gallery {hard}
Write a shape hierarchy with an abstract `Shape` (pure virtual `kind()`, `area()` and `perimeter()`)
and four concrete shapes: `Circle`, `Rect`, `Square` (derived from `Rect`) and `Triangle` (given by
its three side lengths; area by **Heron's formula**: with `s = (a + b + c) / 2`, the area is
`sqrt(s(s-a)(s-b)(s-c))`). Use `3.14159265358979` for π. Keep all shapes in one container of
`std::unique_ptr<Shape>` keyed by name.

**Input:** commands until end of input. Lengths are positive numbers.

| Command | Effect |
| --- | --- |
| `circle NAME R`, `rect NAME W H`, `square NAME S`, `triangle NAME A B C` | add a shape, replacing any shape with the same name |
| `remove NAME` | remove it (`error: no NAME` if there's none) |
| `list` | every shape sorted by **area**, smallest first, ties in alphabetical order of name: `NAME KIND area=A perimeter=P` |
| `largest` | the name of the shape with the largest area (ties: alphabetically first) |
| `total` | `total area T` |

Numbers are printed with exactly 2 decimals. `list` and `largest` print `(none)` when there are no
shapes. A triangle whose sides don't satisfy the strict triangle inequality (each side shorter than the
sum of the other two) is rejected with `error: NAME is not a triangle`, and nothing changes.

**Example:** `circle c 1`, `rect r 2 3`, `square s 2`, `triangle t 3 4 5`, `list`, `largest` prints

```
c circle area=3.14 perimeter=6.28
s square area=4.00 perimeter=8.00
r rect area=6.00 perimeter=10.00
t triangle area=6.00 perimeter=12.00
r
```

```cpp starter
#include <iostream>
#include <map>
#include <memory>
#include <string>

// design the Shape hierarchy here

int main() {
    // read commands until end of input
}
```

```cpp solution
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

const double PI = 3.14159265358979;

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::string kind() const = 0;
    virtual double area() const = 0;
    virtual double perimeter() const = 0;
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    std::string kind() const override { return "circle"; }
    double area() const override { return PI * r_ * r_; }
    double perimeter() const override { return 2 * PI * r_; }
};

class Rect : public Shape {
protected:
    double w_, h_;
public:
    Rect(double w, double h) : w_(w), h_(h) {}
    std::string kind() const override { return "rect"; }
    double area() const override { return w_ * h_; }
    double perimeter() const override { return 2 * (w_ + h_); }
};

class Square : public Rect {
public:
    explicit Square(double s) : Rect(s, s) {}
    std::string kind() const override { return "square"; }
};

class Triangle : public Shape {
    double a_, b_, c_;
public:
    Triangle(double a, double b, double c) : a_(a), b_(b), c_(c) {}
    static bool valid(double a, double b, double c) { return a + b > c && a + c > b && b + c > a; }
    std::string kind() const override { return "triangle"; }
    double perimeter() const override { return a_ + b_ + c_; }
    double area() const override {
        double s = perimeter() / 2;
        return std::sqrt(s * (s - a_) * (s - b_) * (s - c_));   // Heron's formula
    }
};

int main() {
    std::map<std::string, std::unique_ptr<Shape>> shapes;
    std::cout << std::fixed << std::setprecision(2);
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "list" || cmd == "largest" || cmd == "total") {
            std::vector<std::pair<double, std::string>> order;   // (area, name): sorts by area, then name
            for (const auto& [name, s] : shapes) order.push_back({s->area(), name});
            std::sort(order.begin(), order.end());
            if (cmd == "list") {
                if (order.empty()) std::cout << "(none)\n";
                for (const auto& [area, name] : order) {
                    const Shape& s = *shapes[name];
                    std::cout << name << ' ' << s.kind() << " area=" << area << " perimeter=" << s.perimeter() << '\n';
                }
            } else if (cmd == "largest") {
                if (order.empty()) std::cout << "(none)\n";
                else {
                    std::size_t i = 0;                       // first (alphabetically) with the largest area
                    while (order[i].first != order.back().first) ++i;
                    std::cout << order[i].second << '\n';
                }
            } else {
                double total = 0;
                for (const auto& p : order) total += p.first;
                std::cout << "total area " << total << '\n';
            }
            continue;
        }
        std::string name;
        std::cin >> name;
        if (cmd == "remove") {
            if (!shapes.erase(name)) std::cout << "error: no " << name << '\n';
        } else if (cmd == "circle") {
            double r;
            std::cin >> r;
            shapes[name] = std::make_unique<Circle>(r);
        } else if (cmd == "rect") {
            double w, h;
            std::cin >> w >> h;
            shapes[name] = std::make_unique<Rect>(w, h);
        } else if (cmd == "square") {
            double s;
            std::cin >> s;
            shapes[name] = std::make_unique<Square>(s);
        } else if (cmd == "triangle") {
            double a, b, c;
            std::cin >> a >> b >> c;
            if (Triangle::valid(a, b, c)) shapes[name] = std::make_unique<Triangle>(a, b, c);
            else std::cout << "error: " << name << " is not a triangle\n";
        }
    }
}
```

```hint
`Square` only needs a constructor that passes `(s, s)` to `Rect` and its own `kind()`: area and
perimeter are inherited. Make `Shape`'s destructor virtual, since the shapes are deleted through
`std::unique_ptr<Shape>`.
```

```hint
To sort, build a `std::vector<std::pair<double, std::string>>` of `(area, name)` and `std::sort` it:
pairs compare by the first member, then the second, which is exactly "by area, ties by name".
```

```stdin
circle c 1
rect r 2 3
square s 2
triangle t 3 4 5
list
largest
```

```expected
c circle area=3.14 perimeter=6.28
s square area=4.00 perimeter=8.00
r rect area=6.00 perimeter=10.00
t triangle area=6.00 perimeter=12.00
r
```

```stdin
list
largest
total
remove x
square a 2
rect b 1 4
rect a 4 1
list
largest
triangle flat 1 2 3
triangle neg 1 1 5
list
remove a
remove a
list
total
```

```expected hidden
(none)
(none)
total area 0.00
error: no x
a rect area=4.00 perimeter=10.00
b rect area=4.00 perimeter=10.00
a
error: flat is not a triangle
error: neg is not a triangle
a rect area=4.00 perimeter=10.00
b rect area=4.00 perimeter=10.00
error: no a
b rect area=4.00 perimeter=10.00
total area 4.00
```

```stdin
triangle eq 2 2 2
circle big 10
circle tiny 0.5
square sq 1.5
list
total
largest
circle big 0.1
largest
triangle sq 5 12 13
list
```

```expected hidden
tiny circle area=0.79 perimeter=3.14
eq triangle area=1.73 perimeter=6.00
sq square area=2.25 perimeter=6.00
big circle area=314.16 perimeter=62.83
total area 318.93
big
sq
big circle area=0.03 perimeter=0.63
tiny circle area=0.79 perimeter=3.14
eq triangle area=1.73 perimeter=6.00
sq triangle area=30.00 perimeter=30.00
```

```checks
must virtual\s+double\s+area\s*\(\s*\)\s*const\s*=\s*0 :: Make area() pure virtual in Shape.
must class\s+Square\s*:\s*public\s+Rect :: Square should derive from Rect.
must std::unique_ptr\s*<\s*Shape\s*> :: Store the shapes as std::unique_ptr<Shape>.
```
:::

:::exercise Expression trees {hard}
Build an **expression tree**: an abstract `Expr` with pure virtual `eval` and `str`, and node classes
for numbers, variables, unary negation and the binary operators. Each operator node **owns** its
operands through `std::unique_ptr<Expr>`. Expressions are written in **prefix** (Polish) notation, where
an operator comes before its operands, so `+ 2 * x 3` means `2 + (x * 3)`.

**Input:** lines until end of input:

- `let NAME VALUE`: set an integer variable (it may be set again later).
- `eval EXPR`: `EXPR` is a valid prefix expression made of integer literals (possibly negative, like
  `-7`), variable names (letters), the binary operators `+ - * /` and the unary operator `neg`, all
  separated by spaces.

**Output:** for each `eval`, the expression in **fully parenthesized infix** form (`(a op b)` for binary
operators, `(-a)` for `neg`, numbers and names as they are), followed by ` = VALUE`, or by
` : error: MESSAGE` if evaluation fails. `/` is integer division that truncates toward zero, as in C++.
The messages are `unknown variable NAME` and `division by zero`. Evaluate the left operand completely
before the right one, and report only the **first** error.

**Constraints:** all values and intermediate results fit in `long long`.

**Example:** after `let x 5`, the line `eval + 2 * x 3` prints `(2 + (x * 3)) = 17`, and
`eval / x - x x` prints `(x / (x - x)) : error: division by zero`.

```cpp starter
#include <iostream>
#include <map>
#include <memory>
#include <sstream>
#include <string>

// design the Expr hierarchy and a prefix parser here

int main() {
    // read lines until end of input
}
```

```cpp solution
#include <cctype>
#include <iostream>
#include <map>
#include <memory>
#include <optional>
#include <sstream>
#include <string>
#include <utility>

struct Context {
    std::map<std::string, long long> vars;
    std::string error;   // set by the first failing node
};

class Expr {
public:
    virtual ~Expr() = default;
    virtual std::optional<long long> eval(Context& ctx) const = 0;
    virtual std::string str() const = 0;
};

class Number : public Expr {
    long long v_;
public:
    explicit Number(long long v) : v_(v) {}
    std::optional<long long> eval(Context&) const override { return v_; }
    std::string str() const override { return std::to_string(v_); }
};

class Variable : public Expr {
    std::string name_;
public:
    explicit Variable(std::string n) : name_(std::move(n)) {}
    std::optional<long long> eval(Context& ctx) const override {
        auto it = ctx.vars.find(name_);
        if (it == ctx.vars.end()) {
            ctx.error = "unknown variable " + name_;
            return std::nullopt;
        }
        return it->second;
    }
    std::string str() const override { return name_; }
};

class Negate : public Expr {
    std::unique_ptr<Expr> operand_;
public:
    explicit Negate(std::unique_ptr<Expr> e) : operand_(std::move(e)) {}
    std::optional<long long> eval(Context& ctx) const override {
        auto v = operand_->eval(ctx);
        if (!v) return std::nullopt;
        return -*v;
    }
    std::string str() const override { return "(-" + operand_->str() + ")"; }
};

class Binary : public Expr {
    char op_;
    std::unique_ptr<Expr> left_, right_;
public:
    Binary(char op, std::unique_ptr<Expr> l, std::unique_ptr<Expr> r)
        : op_(op), left_(std::move(l)), right_(std::move(r)) {}
    std::optional<long long> eval(Context& ctx) const override {
        auto a = left_->eval(ctx);       // left first: its error wins
        if (!a) return std::nullopt;
        auto b = right_->eval(ctx);
        if (!b) return std::nullopt;
        switch (op_) {
            case '+': return *a + *b;
            case '-': return *a - *b;
            case '*': return *a * *b;
            default:
                if (*b == 0) {
                    ctx.error = "division by zero";
                    return std::nullopt;
                }
                return *a / *b;
        }
    }
    std::string str() const override {
        return "(" + left_->str() + " " + op_ + " " + right_->str() + ")";
    }
};

// Reads one prefix expression from the stream.
std::unique_ptr<Expr> parse(std::istream& in) {
    std::string tok;
    in >> tok;
    if (tok == "neg") return std::make_unique<Negate>(parse(in));
    if (tok == "+" || tok == "-" || tok == "*" || tok == "/") {
        auto left = parse(in);
        auto right = parse(in);
        return std::make_unique<Binary>(tok[0], std::move(left), std::move(right));
    }
    if (std::isdigit(static_cast<unsigned char>(tok[0])) || tok[0] == '-') return std::make_unique<Number>(std::stoll(tok));
    return std::make_unique<Variable>(tok);
}

int main() {
    Context ctx;
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string cmd;
        if (!(in >> cmd)) continue;
        if (cmd == "let") {
            std::string name;
            long long v;
            in >> name >> v;
            ctx.vars[name] = v;
        } else if (cmd == "eval") {
            std::unique_ptr<Expr> e = parse(in);
            ctx.error.clear();
            auto v = e->eval(ctx);
            if (v) std::cout << e->str() << " = " << *v << '\n';
            else std::cout << e->str() << " : error: " << ctx.error << '\n';
        }
    }
}
```

```hint
Prefix notation parses with a tiny **recursive** function: read one token; if it's an operator, call
yourself to parse its operand(s) and build the node; otherwise it's a leaf (a number if it starts with a
digit or is a `-` followed by digits, otherwise a variable). The token `-` on its own is the operator.
Read each line with `std::getline` and parse it from a `std::istringstream`.
```

```hint
Without exceptions (a later module), `eval` can return `std::optional<long long>` and write the error
message into a context object it receives by reference (along with the variables). A binary node
returns `std::nullopt` as soon as its left operand fails, which makes "first error wins" automatic.
```

```stdin
let x 5
eval + 2 * x 3
eval / x - x x
```

```expected
(2 + (x * 3)) = 17
(x / (x - x)) : error: division by zero
```

```stdin
let x 5
eval neg - x 7
eval / 7 -2
eval / -7 2
eval 42
eval -42
eval + y / 1 0
let y -1
eval + y / 1 0
eval * neg neg x z
let x 100
eval - x - x x
```

```expected hidden
(-(x - 7)) = 2
(7 / -2) = -3
(-7 / 2) = -3
42 = 42
-42 = -42
(y + (1 / 0)) : error: unknown variable y
(y + (1 / 0)) : error: division by zero
((-(-x)) * z) : error: unknown variable z
(x - (x - x)) = 100
```

```stdin
eval q
let a 3
let b 4
eval + * a a * b b
eval / * a b - a a
eval / - a a * b b
eval neg neg neg a
eval / * 1000000 1000000 - 0 7
let a 0
eval / b a
eval * / b a zz
```

```expected hidden
q : error: unknown variable q
((a * a) + (b * b)) = 25
((a * b) / (a - a)) : error: division by zero
((a - a) / (b * b)) = 0
(-(-(-a))) = -3
((1000000 * 1000000) / (0 - 7)) = -142857142857
(b / a) : error: division by zero
((b / a) * zz) : error: division by zero
```

```checks
must virtual\s+[^;{]*\beval\s*\([^)]*\)\s*(const\s*)?=\s*0 :: Make eval a pure virtual function of Expr.
must std::unique_ptr\s*<\s*Expr\s*> :: Operator nodes should own their operands through std::unique_ptr<Expr>.
must \boverride\b :: Mark the overrides with override.
```
:::

:::exercise Event dispatcher {hard}
Write an **event dispatcher**: handlers subscribe to a topic, and every emitted event is delivered to
each handler whose topic matches (the topic `*` matches everything), **in subscription order**. The
dispatcher knows handlers only through an abstract base class `Handler`; each kind of handler overrides
how it reacts and how it describes itself.

An event has a topic (a word) and an integer value. Handler kinds:

| Kind | On each event it receives | `stats` line |
| --- | --- | --- |
| `log` | prints `[ID] TOPIC: VALUE` | `log ID TOPIC` |
| `count` | counts it and adds up the values | `count ID TOPIC: N events, sum S` |
| `alarm` (with a limit) | if `VALUE > LIMIT`, prints `[ID] ALARM TOPIC=VALUE` | `alarm ID TOPIC>LIMIT: K alarms` |
| `once` | prints `[ID] first TOPIC: VALUE`, then **unsubscribes itself** | `once ID TOPIC: waiting` |

A `once` handler is removed **after** the event has been delivered to all handlers, so the other
handlers still receive that event.

**Input:** commands until end of input:

| Command | Effect |
| --- | --- |
| `sub KIND ID TOPIC` (`alarm` adds ` LIMIT`) | subscribe a new handler; `error: ID exists` if the id is taken |
| `unsub ID` | remove it; `error: no ID` if there's none |
| `emit TOPIC VALUE` | deliver the event; if **no** handler received it, print `(nobody listens to TOPIC)` |
| `stats` | each handler's `stats` line in subscription order, or `(no handlers)` |

**Example:** `sub log L temp`, `sub alarm A temp 30`, `sub once O *`, `emit temp 31`, `emit temp 5`,
`emit rain 1` prints

```
[L] temp: 31
[A] ALARM temp=31
[O] first temp: 31
[L] temp: 5
(nobody listens to rain)
```

```cpp starter
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// design Handler, its subclasses and the Dispatcher here

int main() {
    // read commands until end of input
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

struct Event {
    std::string topic;
    long long value;
};

class Handler {
    std::string id_, topic_;
public:
    Handler(std::string id, std::string topic) : id_(std::move(id)), topic_(std::move(topic)) {}
    virtual ~Handler() = default;
    const std::string& id() const { return id_; }
    const std::string& topic() const { return topic_; }
    bool wants(const Event& e) const { return topic_ == "*" || topic_ == e.topic; }

    virtual void handle(const Event& e) = 0;
    virtual std::string describe() const = 0;
    virtual bool finished() const { return false; }   // true: remove me after this delivery
};

class Logger : public Handler {
public:
    using Handler::Handler;
    void handle(const Event& e) override { std::cout << '[' << id() << "] " << e.topic << ": " << e.value << '\n'; }
    std::string describe() const override { return "log " + id() + " " + topic(); }
};

class Counter : public Handler {
    long long count_ = 0, sum_ = 0;
public:
    using Handler::Handler;
    void handle(const Event& e) override { ++count_; sum_ += e.value; }
    std::string describe() const override {
        return "count " + id() + " " + topic() + ": " + std::to_string(count_) + " events, sum " + std::to_string(sum_);
    }
};

class Alarm : public Handler {
    long long limit_;
    int alarms_ = 0;
public:
    Alarm(std::string id, std::string topic, long long limit) : Handler(std::move(id), std::move(topic)), limit_(limit) {}
    void handle(const Event& e) override {
        if (e.value > limit_) {
            ++alarms_;
            std::cout << '[' << id() << "] ALARM " << e.topic << '=' << e.value << '\n';
        }
    }
    std::string describe() const override {
        return "alarm " + id() + " " + topic() + ">" + std::to_string(limit_) + ": " + std::to_string(alarms_) + " alarms";
    }
};

class Once : public Handler {
    bool fired_ = false;
public:
    using Handler::Handler;
    void handle(const Event& e) override {
        fired_ = true;
        std::cout << '[' << id() << "] first " << e.topic << ": " << e.value << '\n';
    }
    std::string describe() const override { return "once " + id() + " " + topic() + ": waiting"; }
    bool finished() const override { return fired_; }
};

class Dispatcher {
    std::vector<std::unique_ptr<Handler>> handlers_;   // in subscription order
public:
    bool has(const std::string& id) const {
        for (const auto& h : handlers_)
            if (h->id() == id) return true;
        return false;
    }
    void subscribe(std::unique_ptr<Handler> h) { handlers_.push_back(std::move(h)); }
    bool unsubscribe(const std::string& id) {
        for (std::size_t i = 0; i < handlers_.size(); ++i) {
            if (handlers_[i]->id() == id) {
                handlers_.erase(handlers_.begin() + static_cast<std::ptrdiff_t>(i));
                return true;
            }
        }
        return false;
    }
    int emit(const Event& e) {
        int delivered = 0;
        for (const auto& h : handlers_) {
            if (h->wants(e)) {
                h->handle(e);
                ++delivered;
            }
        }
        // remove finished handlers only after the delivery loop
        std::vector<std::unique_ptr<Handler>> keep;
        for (auto& h : handlers_)
            if (!h->finished()) keep.push_back(std::move(h));
        handlers_ = std::move(keep);
        return delivered;
    }
    void stats() const {
        if (handlers_.empty()) std::cout << "(no handlers)\n";
        for (const auto& h : handlers_) std::cout << h->describe() << '\n';
    }
};

int main() {
    Dispatcher d;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "sub") {
            std::string kind, id, topic;
            std::cin >> kind >> id >> topic;
            long long limit = 0;
            if (kind == "alarm") std::cin >> limit;
            if (d.has(id)) {
                std::cout << "error: " << id << " exists\n";
                continue;
            }
            if (kind == "log") d.subscribe(std::make_unique<Logger>(id, topic));
            else if (kind == "count") d.subscribe(std::make_unique<Counter>(id, topic));
            else if (kind == "alarm") d.subscribe(std::make_unique<Alarm>(id, topic, limit));
            else d.subscribe(std::make_unique<Once>(id, topic));
        } else if (cmd == "unsub") {
            std::string id;
            std::cin >> id;
            if (!d.unsubscribe(id)) std::cout << "error: no " << id << '\n';
        } else if (cmd == "emit") {
            Event e;
            std::cin >> e.topic >> e.value;
            if (d.emit(e) == 0) std::cout << "(nobody listens to " << e.topic << ")\n";
        } else if (cmd == "stats") {
            d.stats();
        }
    }
}
```

```hint
Put what every handler shares (id, topic, "does this event match me?") in the base class, and make
`handle(const Event&)` and `describe()` pure virtual. A third virtual function with a default, such as
`virtual bool finished() const { return false; }`, lets a `once` handler ask to be removed without the
dispatcher knowing which kind it is.
```

```hint
Don't erase from the vector while you are looping over it to deliver an event. Deliver to everyone
first, then rebuild (or erase from) the list of `std::unique_ptr<Handler>`, dropping the finished
handlers.
```

```stdin
sub log L temp
sub alarm A temp 30
sub once O *
emit temp 31
emit temp 5
emit rain 1
```

```expected
[L] temp: 31
[A] ALARM temp=31
[O] first temp: 31
[L] temp: 5
(nobody listens to rain)
```

```stdin
stats
emit x 1
sub log L temp
sub alarm A temp 30
sub count C *
sub once O door
emit temp 25
emit temp 31
emit door 1
emit door 2
emit wind -9
stats
unsub L
unsub L
sub log C x
sub log L wind
stats
emit temp 30
emit wind 0
```

```expected hidden
(no handlers)
(nobody listens to x)
[L] temp: 25
[L] temp: 31
[A] ALARM temp=31
[O] first door: 1
log L temp
alarm A temp>30: 1 alarms
count C *: 5 events, sum 50
error: no L
error: C exists
alarm A temp>30: 1 alarms
count C *: 5 events, sum 50
log L wind
[L] wind: 0
```

```stdin
sub once a *
sub once b *
sub once c t
emit t 1
emit t 2
stats
sub count n t
sub once a t
emit t 3
emit u 4
unsub n
stats
sub alarm z q -5
emit q -5
emit q -4
stats
```

```expected hidden
[a] first t: 1
[b] first t: 1
[c] first t: 1
(nobody listens to t)
(no handlers)
[a] first t: 3
(nobody listens to u)
(no handlers)
[z] ALARM q=-4
alarm z q>-5: 1 alarms
```

```checks
must virtual\s+void\s+handle\s*\([^)]*\)\s*(const\s*)?=\s*0 :: Make handle a pure virtual function of Handler.
must std::unique_ptr\s*<\s*Handler\s*> :: Keep the handlers as std::unique_ptr<Handler>.
must \boverride\b :: Mark the overrides with override.
```
:::

:::exercise File system tree {hard}
Model an in-memory file system with the **composite** pattern: an abstract `Entry` with two kinds,
`File` (has a size) and `Directory` (owns its children through `std::unique_ptr<Entry>`). A directory's
size is the total size of everything inside it, computed **recursively through virtual calls**: the
directory never needs to know whether a child is a file or another directory.

Paths are absolute, like `/docs/old/b.txt`; `/` is the root directory, which always exists and starts
empty. Names contain no `/`.

| Command | Effect |
| --- | --- |
| `mkdir PATH` | create an empty directory |
| `touch PATH SIZE` | create a file of that size, or set the size of the existing file |
| `rm PATH` | remove a file, or a directory with everything in it |
| `du PATH` | print `SIZE PATH` |
| `ls PATH` | a directory: its entries in alphabetical order, `NAME/` for directories and `NAME SIZE` for files, or `(empty)`; a file: `NAME SIZE` |
| `tree` | the whole tree, one entry per line, indented 2 spaces per level, children alphabetical; directories as `NAME/ (SIZE)`, the root as `/ (SIZE)`, files as `NAME SIZE` |

**Errors** print a line and change nothing:

- `mkdir` / `touch`: if some directory on the way doesn't exist or is a file, `error: bad path PATH`;
  for `mkdir` on an existing entry (including `/`), `error: PATH exists`; for `touch` on a directory,
  `error: PATH is a directory`.
- `rm`, `du`, `ls` on a path that doesn't exist: `error: no PATH`; `rm /`: `error: cannot remove /`.

**Example:** `mkdir /docs`, `touch /docs/a.txt 100`, `mkdir /docs/old`, `touch /docs/old/b.txt 50`,
`touch /readme 7`, `tree` prints

```
/ (157)
  docs/ (150)
    a.txt 100
    old/ (50)
      b.txt 50
  readme 7
```

```cpp starter
#include <iostream>
#include <map>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

// design Entry, File and Directory here

int main() {
    // read commands until end of input
}
```

```cpp solution
#include <iostream>
#include <map>
#include <memory>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

class Directory;

class Entry {
    std::string name_;
public:
    explicit Entry(std::string name) : name_(std::move(name)) {}
    virtual ~Entry() = default;
    const std::string& name() const { return name_; }
    virtual long long size() const = 0;
    virtual void print(int depth) const = 0;           // one line per entry, indented
    virtual void list() const = 0;                     // what "ls" shows
    virtual Directory* asDirectory() { return nullptr; }
};

class File : public Entry {
    long long size_;
public:
    File(std::string name, long long size) : Entry(std::move(name)), size_(size) {}
    long long size() const override { return size_; }
    void resize(long long s) { size_ = s; }
    void print(int depth) const override { std::cout << std::string(2 * depth, ' ') << name() << ' ' << size_ << '\n'; }
    void list() const override { std::cout << name() << ' ' << size_ << '\n'; }
};

class Directory : public Entry {
    std::map<std::string, std::unique_ptr<Entry>> children_;   // sorted by name
public:
    using Entry::Entry;
    Directory* asDirectory() override { return this; }
    long long size() const override {
        long long total = 0;
        for (const auto& [name, e] : children_) total += e->size();   // recursion through virtual calls
        return total;
    }
    void print(int depth) const override {
        std::cout << std::string(2 * depth, ' ') << name() << (name() == "/" ? "" : "/") << " (" << size() << ")\n";
        for (const auto& [name, e] : children_) e->print(depth + 1);
    }
    void list() const override {
        if (children_.empty()) std::cout << "(empty)\n";
        for (const auto& [name, e] : children_) {
            if (e->asDirectory()) std::cout << name << "/\n";
            else std::cout << name << ' ' << e->size() << '\n';
        }
    }
    Entry* child(const std::string& n) {
        auto it = children_.find(n);
        return it == children_.end() ? nullptr : it->second.get();
    }
    void add(std::unique_ptr<Entry> e) {
        std::string n = e->name();
        children_[n] = std::move(e);
    }
    void remove(const std::string& n) { children_.erase(n); }
};

std::vector<std::string> split(const std::string& path) {
    std::vector<std::string> parts;
    std::istringstream in(path);
    std::string part;
    while (std::getline(in, part, '/'))
        if (!part.empty()) parts.push_back(part);
    return parts;
}

// The directory that should contain the last component, or nullptr if the path is broken.
Directory* parentOf(Directory& root, const std::vector<std::string>& parts) {
    Directory* d = &root;
    for (std::size_t i = 0; i + 1 < parts.size(); ++i) {
        Entry* e = d->child(parts[i]);
        if (!e || !e->asDirectory()) return nullptr;
        d = e->asDirectory();
    }
    return d;
}

Entry* lookup(Directory& root, const std::vector<std::string>& parts) {
    if (parts.empty()) return &root;
    Directory* p = parentOf(root, parts);
    return p ? p->child(parts.back()) : nullptr;
}

int main() {
    Directory root("/");
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "tree") {
            root.print(0);
            continue;
        }
        std::string path;
        std::cin >> path;
        std::vector<std::string> parts = split(path);
        if (cmd == "mkdir" || cmd == "touch") {
            long long size = 0;
            if (cmd == "touch") std::cin >> size;
            Directory* p = parts.empty() ? nullptr : parentOf(root, parts);
            Entry* existing = p ? p->child(parts.back()) : nullptr;
            if (parts.empty()) std::cout << "error: " << path << " exists\n";
            else if (!p) std::cout << "error: bad path " << path << '\n';
            else if (cmd == "mkdir") {
                if (existing) std::cout << "error: " << path << " exists\n";
                else p->add(std::make_unique<Directory>(parts.back()));
            } else if (existing && existing->asDirectory()) {
                std::cout << "error: " << path << " is a directory\n";
            } else if (existing) {
                static_cast<File*>(existing)->resize(size);   // not a directory, so it's a File
            } else {
                p->add(std::make_unique<File>(parts.back(), size));
            }
        } else {
            Entry* e = lookup(root, parts);
            if (!e) std::cout << "error: no " << path << '\n';
            else if (cmd == "rm") {
                if (parts.empty()) std::cout << "error: cannot remove /\n";
                else parentOf(root, parts)->remove(parts.back());
            } else if (cmd == "du") {
                std::cout << e->size() << ' ' << path << '\n';
            } else if (cmd == "ls") {
                e->list();
            }
        }
    }
}
```

```hint
Store a directory's children in a `std::map<std::string, std::unique_ptr<Entry>>`: it keeps them
sorted for `ls` and `tree`, and erasing an entry destroys its whole subtree (a virtual destructor in
`Entry` makes that work). `size()` and `print(depth)` are virtual; `Directory::size()` just adds up
`child->size()`.
```

```hint
Split a path on `/` (skipping empty pieces, so `/` becomes no pieces at all) with `std::getline(stream,
part, '/')`. Then one helper that walks to the **parent** directory of the last piece, returning
`nullptr` if something on the way is missing or is a file, serves every command. A virtual
`Directory* asDirectory()` (returning `nullptr` in `Entry`) tells you whether an entry is a directory.
```

```stdin
mkdir /docs
touch /docs/a.txt 100
mkdir /docs/old
touch /docs/old/b.txt 50
touch /readme 7
tree
```

```expected
/ (157)
  docs/ (150)
    a.txt 100
    old/ (50)
      b.txt 50
  readme 7
```

```stdin
mkdir /docs
mkdir /docs/old
touch /docs/a.txt 100
touch /docs/old/b.txt 50
touch /readme 7
du /docs
du /
ls /docs
ls /readme
ls /docs/old/b.txt
mkdir /docs
mkdir /
mkdir /x/y
touch /readme/z 1
touch /docs 3
touch /readme 70
rm /docs/old
tree
rm /
rm /nope
ls /docs/old
du /docs/old/b.txt
```

```expected hidden
150 /docs
157 /
a.txt 100
old/
readme 7
b.txt 50
error: /docs exists
error: / exists
error: bad path /x/y
error: bad path /readme/z
error: /docs is a directory
/ (170)
  docs/ (100)
    a.txt 100
  readme 70
error: cannot remove /
error: no /nope
error: no /docs/old
error: no /docs/old/b.txt
```

```stdin
tree
ls /
du /
mkdir /a
mkdir /a/b
mkdir /a/b/c
touch /a/b/c/deep 5
touch /a/z 1
touch /a/b/m 2
mkdir /a/b/c/deep/x
tree
rm /a/b
ls /a
touch /a/z 0
tree
rm /a
ls /
```

```expected hidden
/ (0)
(empty)
0 /
error: bad path /a/b/c/deep/x
/ (8)
  a/ (8)
    b/ (7)
      c/ (5)
        deep 5
      m 2
    z 1
z 1
/ (0)
  a/ (0)
    z 0
(empty)
```

```checks
must virtual\s+long\s+long\s+size\s*\(\s*\)\s*const\s*=\s*0 :: Make size() a pure virtual function of Entry.
must std::unique_ptr\s*<\s*Entry\s*> :: Directories should own their children through std::unique_ptr<Entry>.
must virtual\s*~\s*Entry :: Give Entry a virtual destructor.
```
:::
