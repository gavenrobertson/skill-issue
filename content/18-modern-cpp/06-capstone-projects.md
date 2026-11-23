---
title: Capstone Projects & Where to Go Next
summary: Six multi-part projects that combine classes, templates, containers, streams, exceptions, and polymorphism, including an expression interpreter and a small virtual machine, followed by a roadmap for continuing your C++ journey.
---

## Putting it all together

You've learned the language piece by piece. Real programs use all the pieces at once, and the hard part
stops being syntax and becomes **design**: which classes exist, who owns what, how data flows, how
errors are reported. These six capstones are bigger than any exercise so far. Each is a complete
little program with a precise command language, so the checker can test it.

They are meant to be **hard**, and to take a while: an evening each is normal. Give every one a real
attempt on your own before you open a hint, and only compare with the solution once yours passes (or once
you've been stuck for a long time). The hidden tests target the error paths and corner cases described in
each specification, so test those yourself too.

### How to approach a project

1. **Read the whole specification first.** Note every command, every message, and the exact output format.
2. **Design the data before the code.** What are the nouns (classes, structs)? Which container holds them
   (`std::map` for lookup by name and sorted output, `std::vector` for ordered lists)? Who owns objects
   (values, or `std::unique_ptr` for polymorphic ones)?
3. **Separate parsing from logic.** One part turns a line of text into a command; another part (a class
   with clear member functions) does the work. The logic shouldn't know about `std::cin`; the parser
   shouldn't know about the internals.
4. **Build incrementally.** Get one command working end to end, press **Run** with a small input, then add
   the next. Don't write 200 lines before compiling once.
5. **Handle errors deliberately.** Decide which failures are "normal" (return a value, `std::optional`)
   and which are exceptional (throw), and test the error paths, not just the happy path.

Every capstone reads commands **one per line** with `std::getline`, then parses the line with a
`std::istringstream`. This pattern (from the string streams lesson) makes it easy to ignore blank lines and
to cope with missing arguments:

```cpp
std::string line;
while (std::getline(std::cin, line)) {
    std::istringstream in(line);
    std::string command;
    if (!(in >> command)) continue;          // blank line
    if (command == "add") {
        std::string name;
        int qty;
        if (in >> name >> qty) { /* ... */ }
        else std::cout << "error: invalid add\n";
    }
    // ...
}
```

Two design questions before you start:

:::quiz
The bank capstone stores `CheckingAccount` and `SavingsAccount` objects in one map. Why must the map's
value type be `std::unique_ptr<Account>` rather than `Account`?

- [ ] `std::map` can't store classes
- [x] Storing `Account` by value would slice derived objects (and `Account` is abstract, so it can't even be stored by value)
- [ ] `unique_ptr` makes the accounts thread-safe
- [ ] It's only a style preference

Polymorphism needs indirection: a pointer or reference to the base class. `std::unique_ptr` adds
automatic cleanup and makes the map the clear owner.
:::

:::quiz
Why make `Inventory::save` take a `std::ostream&` instead of a file name?

- [ ] Streams are faster than files
- [x] The same function then works with files, string streams, and `std::cout`, which also makes it easy to test
- [ ] File names can't be passed to member functions
- [ ] `std::ofstream` can't write CSV

Depending on the abstract stream interface instead of a concrete file decouples the logic from where
the data goes.
:::

And two warm-ups that mix ideas from the last modules:

:::quiz
What does this print?

```cpp
void f(int&)  { std::cout << "L"; }
void f(int&&) { std::cout << "R"; }

template <typename T>
void g(T&& x) {
    f(x);
    f(std::forward<T>(x));
}

int main() {
    int a = 1;
    g(a);
    g(2);
}
```

- [ ] `LLRR`
- [x] `LLLR`
- [ ] `LRLR`
- [ ] `RRRR`

Inside `g`, `x` has a name, so `f(x)` always picks the lvalue overload. `std::forward<T>(x)` restores the
original category: an lvalue for `g(a)` (`T = int&`) and an rvalue for `g(2)` (`T = int`). So the calls
print `L L`, then `L R`.
:::

:::quiz
What does this print?

```cpp
using namespace std::chrono;
seconds s{-90};
std::cout << duration_cast<minutes>(s).count() << ' '
          << floor<minutes>(s).count() << ' '
          << ceil<minutes>(s).count();
```

- [ ] `-2 -2 -1`
- [x] `-1 -2 -1`
- [ ] `-1 -1 -1`
- [ ] `-2 -1 -2`

−90 s is −1.5 min. `duration_cast` truncates **toward zero** (−1), `floor` rounds toward negative infinity
(−2), and `ceil` toward positive infinity (−1). For negative durations, truncation and `floor` differ.
:::

The starters only give you a skeleton. Take your time: these are meant to take a while. Use the hints
when stuck, and compare with the solution afterwards; there are many good designs.

:::exercise Capstone 1: Inventory manager {hard}
Build an inventory manager with **save/load**. Store items in a class `Inventory` that keeps a
`std::map` from item name to quantity and unit price. Saving and loading must be done by member
functions `void save(std::ostream& out) const` and `void load(std::istream& in)`, writing and reading a
simple CSV format (`name,qty,price` per line). In this program, the "file" is a `std::string`: `save`
writes into a `std::ostringstream` whose text you keep, and `load` reads it back through a
`std::istringstream`. (Because they take `std::ostream&`/`std::istream&`, the same functions would work
unchanged with `std::ofstream`/`std::ifstream`.)

Commands, one per line (blank lines are ignored; names are single words):

| Command | Effect and output |
| --- | --- |
| `add <name> <qty> <price>` | If `qty` is a positive integer and `price` a non-negative number: add `qty` to the item (creating it if needed) and set its unit price to `price`; print `added <qty> <name>`. Otherwise print `error: invalid add`. |
| `remove <name> <qty>` | If `qty` isn't a positive integer: `error: invalid remove`. If the item doesn't exist: `error: unknown item <name>`. If there aren't enough: `error: only <have> <name> in stock`. Otherwise subtract, delete the item if it reaches 0, and print `removed <qty> <name>`. |
| `report` | For each item in alphabetical order: `<name>: <qty> @ <price> = <qty*price>`, then `total: <sum>`. Money has exactly 2 decimals. With no items, print `(empty)` before the total. |
| `save` | Save the inventory to the "file" (replacing any earlier save); print `saved <k> items`. Every quantity and price must survive the save/load round trip **exactly**. |
| `load` | Replace the inventory with the saved one; print `loaded <k> items`. If nothing was saved yet: `error: nothing saved`. |
| `clear` | Remove all items; print `cleared`. |
| anything else | `error: unknown command <command>` |

```cpp starter
#include <iomanip>
#include <iostream>
#include <map>
#include <sstream>
#include <string>

struct Item {
    int qty = 0;
    double price = 0;
};

class Inventory {
public:
    void add(const std::string& name, int qty, double price) {
        // TODO
    }

    void report(std::ostream& out) const {
        // TODO
    }

    void save(std::ostream& out) const {
        // TODO: one "name,qty,price" line per item
    }

    void load(std::istream& in) {
        // TODO: parse the lines written by save
    }

private:
    std::map<std::string, Item> items_;
};

int main() {
    Inventory inventory;
    std::string savedFile;   // the "file"

    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string cmd;
        if (!(in >> cmd)) continue;
        // TODO: dispatch on cmd
    }
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <limits>
#include <map>
#include <sstream>
#include <string>

struct Item {
    int qty = 0;
    double price = 0;
};

class Inventory {
public:
    void add(const std::string& name, int qty, double price) {
        Item& item = items_[name];
        item.qty += qty;
        item.price = price;
    }

    // Returns an error message, or an empty string on success.
    std::string remove(const std::string& name, int qty) {
        auto it = items_.find(name);
        if (it == items_.end()) return "unknown item " + name;
        if (it->second.qty < qty) return "only " + std::to_string(it->second.qty) + " " + name + " in stock";
        it->second.qty -= qty;
        if (it->second.qty == 0) items_.erase(it);
        return "";
    }

    void report(std::ostream& out) const {
        out << std::fixed << std::setprecision(2);
        if (items_.empty()) out << "(empty)\n";
        double total = 0;
        for (const auto& [name, item] : items_) {
            double value = item.qty * item.price;
            out << name << ": " << item.qty << " @ " << item.price << " = " << value << '\n';
            total += value;
        }
        out << "total: " << total << '\n';
    }

    void save(std::ostream& out) const {
        // enough digits that every double reads back as exactly the same value
        out << std::setprecision(std::numeric_limits<double>::max_digits10);
        for (const auto& [name, item] : items_) {
            out << name << ',' << item.qty << ',' << item.price << '\n';
        }
    }

    void load(std::istream& in) {
        items_.clear();
        std::string line;
        while (std::getline(in, line)) {
            std::istringstream row(line);
            std::string name, qty, price;
            if (std::getline(row, name, ',') && std::getline(row, qty, ',') && std::getline(row, price)) {
                items_[name] = Item{std::stoi(qty), std::stod(price)};
            }
        }
    }

    void clear() { items_.clear(); }
    std::size_t size() const { return items_.size(); }

private:
    std::map<std::string, Item> items_;
};

int main() {
    Inventory inventory;
    std::string savedFile;
    bool hasSave = false;

    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string cmd;
        if (!(in >> cmd)) continue;

        if (cmd == "add") {
            std::string name;
            int qty;
            double price;
            if (in >> name >> qty >> price && qty > 0 && price >= 0) {
                inventory.add(name, qty, price);
                std::cout << "added " << qty << ' ' << name << '\n';
            } else {
                std::cout << "error: invalid add\n";
            }
        } else if (cmd == "remove") {
            std::string name;
            int qty;
            if (in >> name >> qty && qty > 0) {
                std::string error = inventory.remove(name, qty);
                if (error.empty()) std::cout << "removed " << qty << ' ' << name << '\n';
                else std::cout << "error: " << error << '\n';
            } else {
                std::cout << "error: invalid remove\n";
            }
        } else if (cmd == "report") {
            inventory.report(std::cout);
        } else if (cmd == "save") {
            std::ostringstream file;
            inventory.save(file);
            savedFile = file.str();
            hasSave = true;
            std::cout << "saved " << inventory.size() << " items\n";
        } else if (cmd == "load") {
            if (!hasSave) {
                std::cout << "error: nothing saved\n";
            } else {
                std::istringstream file(savedFile);
                inventory.load(file);
                std::cout << "loaded " << inventory.size() << " items\n";
            }
        } else if (cmd == "clear") {
            inventory.clear();
            std::cout << "cleared\n";
        } else {
            std::cout << "error: unknown command " << cmd << '\n';
        }
    }
}
```

```hint
Start with `add` and `report`. A `std::map<std::string, Item>` gives you alphabetical order for free,
and `items_[name]` creates a zero-quantity item if it doesn't exist yet.
```

```hint
For `remove`, return an error message (or an empty string for success) from the member function, or
throw an exception and catch it in `main`. Either keeps the printing in one place.
```

```hint
`save` can do `out << name << ',' << item.qty << ',' << item.price << '\n';` for each item. In `load`,
read each line with `std::getline(in, line)`, then split it with `std::getline(row, field, ',')` and
convert with `std::stoi` / `std::stod`.
```

```hint
Careful with precision: a stream prints doubles with **6 significant digits** by default, so a price of
`1234567.89` would be saved as `1.23457e+06` and come back wrong. Write with
`std::setprecision(std::numeric_limits<double>::max_digits10)` (17 for `double`), which guarantees that
reading the text back gives the identical value.
```

```hint
Track whether anything was saved with a `bool`: an empty inventory can be saved too, so an empty string
doesn't mean "nothing saved".
```

```stdin
add apple 10 0.5
add bread 2 2.25
add apple 5 0.6
report
remove apple 20
remove pear 1
remove bread 2
save
clear
report
load
report
```

```expected
added 10 apple
added 2 bread
added 5 apple
apple: 15 @ 0.60 = 9.00
bread: 2 @ 2.25 = 4.50
total: 13.50
error: only 15 apple in stock
error: unknown item pear
removed 2 bread
saved 1 items
cleared
(empty)
total: 0.00
loaded 1 items
apple: 15 @ 0.60 = 9.00
total: 9.00
```

```stdin
load
add widget 3 19.99
add gadget 1 5
save
remove widget 3
add widget 1 25
report
load
report
remove gadget 0
sell gadget
```

```expected hidden
error: nothing saved
added 3 widget
added 1 gadget
saved 2 items
removed 3 widget
added 1 widget
gadget: 1 @ 5.00 = 5.00
widget: 1 @ 25.00 = 25.00
total: 30.00
loaded 2 items
gadget: 1 @ 5.00 = 5.00
widget: 3 @ 19.99 = 59.97
total: 64.97
error: invalid remove
error: unknown command sell
```

```stdin
report
add x 0 1
add y 2 -1
add
```

```expected
(empty)
total: 0.00
error: invalid add
error: invalid add
error: invalid add
```

```stdin
add big 2 1234567.89
add tiny 3 0.07
add third 1 0.3333333333
save
clear
load
report
remove big 2
remove tiny 4
save
load
report
```

```expected hidden
added 2 big
added 3 tiny
added 1 third
saved 3 items
cleared
loaded 3 items
big: 2 @ 1234567.89 = 2469135.78
third: 1 @ 0.33 = 0.33
tiny: 3 @ 0.07 = 0.21
total: 2469136.32
removed 2 big
error: only 3 tiny in stock
saved 2 items
loaded 2 items
third: 1 @ 0.33 = 0.33
tiny: 3 @ 0.07 = 0.21
total: 0.54
```

```checks
must class\s+Inventory :: Put the logic in a class Inventory.
must std::map\s*< :: Store the items in a std::map.
must save\s*\(\s*std::ostream\s*& :: Implement save(std::ostream&).
must load\s*\(\s*std::istream\s*& :: Implement load(std::istream&).
must ostringstream|stringstream :: Save into a std::ostringstream.
```
:::

:::exercise Capstone 2: Text adventure {hard}
Write the engine for a tiny text adventure. The world is given in the starter: four rooms, their
descriptions, exits, and items. The player starts in the `hall`. The `garden` door is **locked** unless
the player carries the `key`.

Read commands one per line. Commands are **case-insensitive** (convert the line to lowercase first)
and words may be separated by any amount of whitespace. Blank lines are ignored. Only the first two
words matter.

| Command | Output |
| --- | --- |
| `look` or `l` | `<room>: <description>`, then `Items: <items joined by ", ">` (or `Items: none`), then `Exits: <directions in alphabetical order, joined by ", ">` |
| `go <dir>`, `<dir>`, or `n`/`s`/`e`/`w` (dir is `north`, `south`, `east`, `west`) | `You enter the <room>.`; or `You can't go that way.` if there's no exit; or `The door is locked.` when entering the garden without the key; `go` with a missing or unknown direction prints `Go where?` |
| `take <item>` or `get <item>` | `Taken: <item>.` (moves it from the room to the inventory) or `There is no <item> here.`; with no item: `Take what?` |
| `drop <item>` | `Dropped: <item>.` (it goes to the **end** of the room's item list) or `You don't have <item>.`; with no item: `Drop what?` |
| `inventory` or `i` | `You carry: <items in the order picked up>` or `You carry nothing.` |
| `quit` | `Bye!` and stop reading input |
| anything else | `I don't understand: <first word>` |

```cpp starter
#include <algorithm>
#include <cctype>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

struct Room {
    std::string description;
    std::map<std::string, std::string> exits;   // direction -> room name
    std::vector<std::string> items;
};

std::map<std::string, Room> makeWorld() {
    std::map<std::string, Room> world;
    world["hall"] = {"A dusty hall with a creaky floor.", {{"north", "library"}, {"east", "kitchen"}}, {"lamp"}};
    world["library"] = {"Shelves of old books line the walls.", {{"south", "hall"}}, {"book", "key"}};
    world["kitchen"] = {"It smells of fresh bread.", {{"west", "hall"}, {"north", "garden"}}, {"bread"}};
    world["garden"] = {"Flowers everywhere. You found the way out!", {{"south", "kitchen"}}, {"flower"}};
    return world;
}

class Game {
public:
    // Handles one input line. Returns false when the game should stop.
    bool handle(const std::string& line) {
        // TODO
        return true;
    }

private:
    std::map<std::string, Room> world_ = makeWorld();
    std::string current_ = "hall";
    std::vector<std::string> inventory_;
};

int main() {
    Game game;
    std::string line;
    while (std::getline(std::cin, line)) {
        if (!game.handle(line)) break;
    }
}
```

```cpp solution
#include <algorithm>
#include <cctype>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

struct Room {
    std::string description;
    std::map<std::string, std::string> exits;   // direction -> room name
    std::vector<std::string> items;
};

std::map<std::string, Room> makeWorld() {
    std::map<std::string, Room> world;
    world["hall"] = {"A dusty hall with a creaky floor.", {{"north", "library"}, {"east", "kitchen"}}, {"lamp"}};
    world["library"] = {"Shelves of old books line the walls.", {{"south", "hall"}}, {"book", "key"}};
    world["kitchen"] = {"It smells of fresh bread.", {{"west", "hall"}, {"north", "garden"}}, {"bread"}};
    world["garden"] = {"Flowers everywhere. You found the way out!", {{"south", "kitchen"}}, {"flower"}};
    return world;
}

std::string join(const std::vector<std::string>& parts) {
    std::string out;
    for (std::size_t i = 0; i < parts.size(); ++i) {
        if (i > 0) out += ", ";
        out += parts[i];
    }
    return out;
}

std::string lower(std::string s) {
    for (char& c : s) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return s;
}

class Game {
public:
    // Returns false when the game should stop.
    bool handle(const std::string& line) {
        std::istringstream in(lower(line));
        std::vector<std::string> words;
        std::string w;
        while (in >> w) words.push_back(w);
        if (words.empty()) return true;

        std::string verb = words[0];
        std::string object = words.size() > 1 ? words[1] : "";

        static const std::map<std::string, std::string> directions{
            {"n", "north"}, {"s", "south"}, {"e", "east"}, {"w", "west"},
            {"north", "north"}, {"south", "south"}, {"east", "east"}, {"west", "west"}};

        if (verb == "look" || verb == "l") {
            look();
        } else if (verb == "go" || directions.contains(verb)) {
            std::string dir = verb == "go" ? object : verb;
            auto it = directions.find(dir);
            if (it == directions.end()) std::cout << "Go where?\n";
            else go(it->second);
        } else if (verb == "take" || verb == "get") {
            if (object.empty()) std::cout << "Take what?\n";
            else take(object);
        } else if (verb == "drop") {
            if (object.empty()) std::cout << "Drop what?\n";
            else drop(object);
        } else if (verb == "inventory" || verb == "i") {
            if (inventory_.empty()) std::cout << "You carry nothing.\n";
            else std::cout << "You carry: " << join(inventory_) << '\n';
        } else if (verb == "quit") {
            std::cout << "Bye!\n";
            return false;
        } else {
            std::cout << "I don't understand: " << verb << '\n';
        }
        return true;
    }

private:
    void look() const {
        const Room& room = world_.at(current_);
        std::cout << current_ << ": " << room.description << '\n';
        std::cout << "Items: " << (room.items.empty() ? "none" : join(room.items)) << '\n';
        std::vector<std::string> exits;
        for (const auto& [dir, target] : room.exits) exits.push_back(dir);
        std::cout << "Exits: " << join(exits) << '\n';
    }

    void go(const std::string& dir) {
        const Room& room = world_.at(current_);
        auto it = room.exits.find(dir);
        if (it == room.exits.end()) {
            std::cout << "You can't go that way.\n";
            return;
        }
        if (it->second == "garden" && !carrying("key")) {
            std::cout << "The door is locked.\n";
            return;
        }
        current_ = it->second;
        std::cout << "You enter the " << current_ << ".\n";
    }

    void take(const std::string& item) {
        auto& items = world_.at(current_).items;
        auto it = std::find(items.begin(), items.end(), item);
        if (it == items.end()) {
            std::cout << "There is no " << item << " here.\n";
            return;
        }
        items.erase(it);
        inventory_.push_back(item);
        std::cout << "Taken: " << item << ".\n";
    }

    void drop(const std::string& item) {
        auto it = std::find(inventory_.begin(), inventory_.end(), item);
        if (it == inventory_.end()) {
            std::cout << "You don't have " << item << ".\n";
            return;
        }
        inventory_.erase(it);
        world_.at(current_).items.push_back(item);
        std::cout << "Dropped: " << item << ".\n";
    }

    bool carrying(const std::string& item) const {
        return std::find(inventory_.begin(), inventory_.end(), item) != inventory_.end();
    }

    std::map<std::string, Room> world_ = makeWorld();
    std::string current_ = "hall";
    std::vector<std::string> inventory_;
};

int main() {
    Game game;
    std::string line;
    while (std::getline(std::cin, line)) {
        if (!game.handle(line)) break;
    }
}
```

```hint
Lowercase the whole line first (`std::tolower` on each `char`, cast through `unsigned char`), then split
it into words with a `std::istringstream`. `words[0]` is the verb, `words[1]` (if present) the object.
```

```hint
A `std::map<std::string, std::string>` from every accepted direction word (`n`, `north`, `s`, ...) to the
full direction name makes `go north`, `north`, and `n` all easy.
```

```hint
Write small private member functions (`look`, `go`, `take`, `drop`) and a `join` helper for the
comma-separated lists. `std::find` on the vectors finds items.
```

```stdin
look
TAKE lamp
e
north
w
go north
get key
  take   book  
inventory
s
drop book
look
e
n
look
fly
quit
look
```

```expected
hall: A dusty hall with a creaky floor.
Items: lamp
Exits: east, north
Taken: lamp.
You enter the kitchen.
The door is locked.
You enter the hall.
You enter the library.
Taken: key.
Taken: book.
You carry: lamp, key, book
You enter the hall.
Dropped: book.
hall: A dusty hall with a creaky floor.
Items: book
Exits: east, north
You enter the kitchen.
You enter the garden.
garden: Flowers everywhere. You found the way out!
Items: flower
Exits: south
I don't understand: fly
Bye!
```

```stdin
i
take
go up
south
drop lamp
take sword

l
n
look
take BOOK
Take Key
I
```

```expected hidden
You carry nothing.
Take what?
Go where?
You can't go that way.
You don't have lamp.
There is no sword here.
hall: A dusty hall with a creaky floor.
Items: lamp
Exits: east, north
You enter the library.
library: Shelves of old books line the walls.
Items: book, key
Exits: south
Taken: book.
Taken: key.
You carry: book, key
```

```stdin
go
GO EAST
look
n
w
w
take lamp now
drop lamp
drop lamp
take lamp
north
take key
s
e
north
drop key
look
s
n
take key
take key
QUIT
look
```

```expected hidden
Go where?
You enter the kitchen.
kitchen: It smells of fresh bread.
Items: bread
Exits: north, west
The door is locked.
You enter the hall.
You can't go that way.
Taken: lamp.
Dropped: lamp.
You don't have lamp.
Taken: lamp.
You enter the library.
Taken: key.
You enter the hall.
You enter the kitchen.
You enter the garden.
Dropped: key.
garden: Flowers everywhere. You found the way out!
Items: flower, key
Exits: south
You enter the kitchen.
The door is locked.
There is no key here.
There is no key here.
Bye!
```

```checks
must istringstream|stringstream :: Split each command line with a std::istringstream.
must tolower :: Make commands case-insensitive with std::tolower.
```
:::

:::exercise Capstone 3: Matrix class template {hard}
Write a class template `Matrix<T>` that stores a `rows × cols` grid in a single `std::vector<T>`
(row-major), with:

- a constructor `Matrix(std::size_t rows, std::size_t cols)` (elements value-initialized),
- `rows()`, `cols()`, and `operator()(r, c)` in both `const` and non-`const` versions,
- `operator+` (element-wise) and `operator*` (matrix product), which throw `std::invalid_argument` with
  the message `dimension mismatch for +` / `dimension mismatch for *` when the sizes don't fit,
- `transpose()` and `operator==`,
- a non-member `operator<<` that prints each row on its own line, elements separated by single spaces.

Read two matrices `A` and `B`, each given as `rows cols` followed by the elements row by row (use
`Matrix<long long>`), and print:

```
A + B:
<A + B, or "error: <message>">
A * B:
<A * B, or "error: <message>">
transpose(A):
<the transpose of A>
A == B: <yes|no>
```

```cpp starter
#include <cstddef>
#include <iostream>
#include <stdexcept>
#include <vector>

template <typename T>
class Matrix {
public:
    Matrix(std::size_t rows, std::size_t cols) : rows_(rows), cols_(cols), data_(rows * cols) {}
    // TODO: rows(), cols(), operator(), +, *, transpose(), ==

private:
    std::size_t rows_;
    std::size_t cols_;
    std::vector<T> data_;
};

int main() {
    // TODO: read A and B, print the results
}
```

```cpp solution
#include <cstddef>
#include <iostream>
#include <stdexcept>
#include <vector>

template <typename T>
class Matrix {
public:
    Matrix(std::size_t rows, std::size_t cols) : rows_(rows), cols_(cols), data_(rows * cols, T{}) {}

    std::size_t rows() const { return rows_; }
    std::size_t cols() const { return cols_; }

    T& operator()(std::size_t r, std::size_t c) { return data_[r * cols_ + c]; }
    const T& operator()(std::size_t r, std::size_t c) const { return data_[r * cols_ + c]; }

    Matrix operator+(const Matrix& o) const {
        if (rows_ != o.rows_ || cols_ != o.cols_) throw std::invalid_argument("dimension mismatch for +");
        Matrix result(rows_, cols_);
        for (std::size_t i = 0; i < data_.size(); ++i) result.data_[i] = data_[i] + o.data_[i];
        return result;
    }

    Matrix operator*(const Matrix& o) const {
        if (cols_ != o.rows_) throw std::invalid_argument("dimension mismatch for *");
        Matrix result(rows_, o.cols_);
        for (std::size_t r = 0; r < rows_; ++r)
            for (std::size_t c = 0; c < o.cols_; ++c) {
                T sum{};
                for (std::size_t k = 0; k < cols_; ++k) sum += (*this)(r, k) * o(k, c);
                result(r, c) = sum;
            }
        return result;
    }

    Matrix transpose() const {
        Matrix result(cols_, rows_);
        for (std::size_t r = 0; r < rows_; ++r)
            for (std::size_t c = 0; c < cols_; ++c) result(c, r) = (*this)(r, c);
        return result;
    }

    bool operator==(const Matrix&) const = default;

private:
    std::size_t rows_;
    std::size_t cols_;
    std::vector<T> data_;
};

template <typename T>
std::ostream& operator<<(std::ostream& out, const Matrix<T>& m) {
    for (std::size_t r = 0; r < m.rows(); ++r) {
        for (std::size_t c = 0; c < m.cols(); ++c) {
            if (c > 0) out << ' ';
            out << m(r, c);
        }
        out << '\n';
    }
    return out;
}

template <typename T>
Matrix<T> readMatrix(std::istream& in) {
    std::size_t rows = 0, cols = 0;
    in >> rows >> cols;
    Matrix<T> m(rows, cols);
    for (std::size_t r = 0; r < rows; ++r)
        for (std::size_t c = 0; c < cols; ++c) in >> m(r, c);
    return m;
}

int main() {
    Matrix<long long> a = readMatrix<long long>(std::cin);
    Matrix<long long> b = readMatrix<long long>(std::cin);

    std::cout << "A + B:\n";
    try {
        std::cout << a + b;
    } catch (const std::invalid_argument& e) {
        std::cout << "error: " << e.what() << '\n';
    }
    std::cout << "A * B:\n";
    try {
        std::cout << a * b;
    } catch (const std::invalid_argument& e) {
        std::cout << "error: " << e.what() << '\n';
    }
    std::cout << "transpose(A):\n" << a.transpose();
    std::cout << "A == B: " << (a == b ? "yes" : "no") << '\n';
}
```

```hint
Element `(r, c)` lives at index `r * cols_ + c` in the vector. Write `operator()` once for `T&` and once
`const` for `const T&`.
```

```hint
For the product, `A` is `m × n` and `B` must be `n × p`; the result is `m × p` and
`result(r, c) = sum over k of A(r, k) * B(k, c)`.
```

```hint
`bool operator==(const Matrix&) const = default;` compares the dimensions and the vector for you.
Catch `std::invalid_argument` around each operation separately so one failure doesn't skip the rest.
```

```stdin
2 2
1 2
3 4
2 2
5 6
7 8
```

```expected
A + B:
6 8
10 12
A * B:
19 22
43 50
transpose(A):
1 3
2 4
A == B: no
```

```stdin
2 3
1 2 3
4 5 6
3 1
1
0
-1
```

```expected
A + B:
error: dimension mismatch for +
A * B:
-2
-2
transpose(A):
1 4
2 5
3 6
A == B: no
```

```stdin
1 1
7
1 1
7
```

```expected hidden
A + B:
14
A * B:
49
transpose(A):
7
A == B: yes
```

```stdin
1 2
1 2
2 1
1
2
```

```expected hidden
A + B:
error: dimension mismatch for +
A * B:
5
transpose(A):
1
2
A == B: no
```

```stdin
2 3
1 2 3
4 5 6
2 3
-1 -2 -3
10 20 30
```

```expected hidden
A + B:
0 0 0
14 25 36
A * B:
error: dimension mismatch for *
transpose(A):
1 4
2 5
3 6
A == B: no
```

```stdin
2 0
0 3
```

```expected hidden
A + B:
error: dimension mismatch for +
A * B:
0 0 0
0 0 0
transpose(A):
A == B: no
```

```checks
must template\s*<\s*typename\s+\w+\s*>\s*class\s+Matrix :: Make Matrix a class template.
must operator\s*\+ :: Overload operator+.
must operator\s*\* :: Overload operator*.
must operator\s*<< :: Overload operator<< for printing.
must throw\s+std::invalid_argument :: Throw std::invalid_argument on dimension mismatch.
```
:::

:::exercise Capstone 4: Bank with accounts and exceptions {hard}
Model a bank with **polymorphic** accounts and **exceptions** for every failure.

- An abstract base class `Account` (id, balance in whole dollars as `long long`) with a virtual
  destructor, `deposit`, and pure virtual `withdraw` and `type`.
- `CheckingAccount` (`type()` is `checking`): may go into overdraft, down to a balance of **−500**.
- `SavingsAccount` (`type()` is `savings`): can't go below 0, and allows at most **3 withdrawals per
  month** (transfers out count as withdrawals). At the end of the month it earns **1% interest**
  (`balance / 100`, integer division) and its withdrawal count resets.
- Store accounts in a `std::map<std::string, std::unique_ptr<Account>>`.
- Report failures by **throwing** exceptions derived from a `BankError` class (itself derived from
  `std::runtime_error`), and catch them in the command loop, printing `error: <what()>`.

Commands, one per line (amounts are integers):

| Command | Success output | Possible errors |
| --- | --- | --- |
| `open <checking\|savings> <id> <amount>` | `opened <type> <id>` | `account <id> already exists`, `unknown account type <type>`, `invalid amount` (negative) |
| `deposit <id> <amount>` | `deposited <amount> to <id>` | `no account <id>`, `invalid amount` (≤ 0) |
| `withdraw <id> <amount>` | `withdrew <amount> from <id>` | `no account <id>`, `invalid amount` (≤ 0), `withdrawal limit reached for <id>`, `insufficient funds in <id>` |
| `transfer <from> <to> <amount>` | `transferred <amount> from <from> to <to>` | `no account <id>` (check `from` first, then `to`), `cannot transfer to the same account`, plus the withdraw errors |
| `month` | `interest paid: <total interest over all savings accounts>` | |
| `report` | `<id> (<type>): <balance>` for each account, sorted by id; `no accounts` if none | |
| anything else | `error: unknown command <command>` | |

Check errors in the order listed in each row (for `withdraw` from savings: the limit is checked before
the funds). A failed command must change **nothing**: in particular, a failed transfer must not take
money out of `from`.

```cpp starter
#include <iostream>
#include <map>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>

class BankError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

class Account {
public:
    Account(std::string id, long long balance) : id_(std::move(id)), balance_(balance) {}
    virtual ~Account() = default;
    // TODO: deposit, pure virtual withdraw and type, a hook for the end of the month

protected:
    std::string id_;
    long long balance_;
};

// TODO: CheckingAccount, SavingsAccount, Bank

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string cmd;
        if (!(in >> cmd)) continue;
        try {
            // TODO
        } catch (const BankError& e) {
            std::cout << "error: " << e.what() << '\n';
        }
    }
}
```

```cpp solution
#include <iostream>
#include <map>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>

class BankError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

class InsufficientFunds : public BankError {
public:
    explicit InsufficientFunds(const std::string& id) : BankError("insufficient funds in " + id) {}
};

class LimitReached : public BankError {
public:
    explicit LimitReached(const std::string& id) : BankError("withdrawal limit reached for " + id) {}
};

class Account {
public:
    explicit Account(std::string id, long long balance) : id_(std::move(id)), balance_(balance) {}
    virtual ~Account() = default;

    const std::string& id() const { return id_; }
    long long balance() const { return balance_; }

    void deposit(long long amount) {
        if (amount <= 0) throw BankError("invalid amount");
        balance_ += amount;
    }

    virtual void withdraw(long long amount) = 0;
    virtual std::string type() const = 0;
    virtual long long endOfMonth() { return 0; }   // returns interest paid

protected:
    std::string id_;
    long long balance_;
};

class CheckingAccount : public Account {
public:
    using Account::Account;
    static constexpr long long overdraftLimit = 500;

    void withdraw(long long amount) override {
        if (amount <= 0) throw BankError("invalid amount");
        if (balance_ - amount < -overdraftLimit) throw InsufficientFunds(id_);
        balance_ -= amount;
    }
    std::string type() const override { return "checking"; }
};

class SavingsAccount : public Account {
public:
    using Account::Account;
    static constexpr int maxWithdrawals = 3;

    void withdraw(long long amount) override {
        if (amount <= 0) throw BankError("invalid amount");
        if (withdrawals_ >= maxWithdrawals) throw LimitReached(id_);
        if (amount > balance_) throw InsufficientFunds(id_);
        balance_ -= amount;
        ++withdrawals_;
    }
    std::string type() const override { return "savings"; }
    long long endOfMonth() override {
        withdrawals_ = 0;
        long long interest = balance_ / 100;
        balance_ += interest;
        return interest;
    }

private:
    int withdrawals_ = 0;
};

class Bank {
public:
    void open(const std::string& type, const std::string& id, long long amount) {
        if (accounts_.contains(id)) throw BankError("account " + id + " already exists");
        if (amount < 0) throw BankError("invalid amount");
        if (type == "checking") accounts_[id] = std::make_unique<CheckingAccount>(id, amount);
        else if (type == "savings") accounts_[id] = std::make_unique<SavingsAccount>(id, amount);
        else throw BankError("unknown account type " + type);
    }

    Account& find(const std::string& id) {
        auto it = accounts_.find(id);
        if (it == accounts_.end()) throw BankError("no account " + id);
        return *it->second;
    }

    void transfer(const std::string& from, const std::string& to, long long amount) {
        Account& source = find(from);
        Account& target = find(to);          // both looked up before anything changes
        if (&source == &target) throw BankError("cannot transfer to the same account");
        source.withdraw(amount);             // may throw: nothing has changed yet
        target.deposit(amount);              // amount is valid here, so this cannot throw
    }

    long long endOfMonth() {
        long long total = 0;
        for (auto& [id, account] : accounts_) total += account->endOfMonth();
        return total;
    }

    void report(std::ostream& out) const {
        if (accounts_.empty()) out << "no accounts\n";
        for (const auto& [id, account] : accounts_) {
            out << id << " (" << account->type() << "): " << account->balance() << '\n';
        }
    }

private:
    std::map<std::string, std::unique_ptr<Account>> accounts_;
};

int main() {
    Bank bank;
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string cmd;
        if (!(in >> cmd)) continue;
        try {
            if (cmd == "open") {
                std::string type, id;
                long long amount = 0;
                in >> type >> id >> amount;
                bank.open(type, id, amount);
                std::cout << "opened " << type << ' ' << id << '\n';
            } else if (cmd == "deposit") {
                std::string id;
                long long amount = 0;
                in >> id >> amount;
                bank.find(id).deposit(amount);
                std::cout << "deposited " << amount << " to " << id << '\n';
            } else if (cmd == "withdraw") {
                std::string id;
                long long amount = 0;
                in >> id >> amount;
                bank.find(id).withdraw(amount);
                std::cout << "withdrew " << amount << " from " << id << '\n';
            } else if (cmd == "transfer") {
                std::string from, to;
                long long amount = 0;
                in >> from >> to >> amount;
                bank.transfer(from, to, amount);
                std::cout << "transferred " << amount << " from " << from << " to " << to << '\n';
            } else if (cmd == "month") {
                std::cout << "interest paid: " << bank.endOfMonth() << '\n';
            } else if (cmd == "report") {
                bank.report(std::cout);
            } else {
                std::cout << "error: unknown command " << cmd << '\n';
            }
        } catch (const BankError& e) {
            std::cout << "error: " << e.what() << '\n';
        }
    }
}
```

```hint
Give `Account` a `virtual long long endOfMonth() { return 0; }` that `SavingsAccount` overrides to pay
interest (returning the amount) and reset its counter. Then `month` just loops over all accounts.
```

```hint
For a safe transfer, look up **both** accounts first (either lookup may throw), then call
`from.withdraw(amount)` (which may throw before changing anything), and only then `to.deposit(amount)`.
```

```hint
Small exception classes keep messages consistent:
`class InsufficientFunds : public BankError { public: explicit InsufficientFunds(const std::string& id) : BankError("insufficient funds in " + id) {} };`
```

```stdin
open checking alice 100
open savings bob 1000
open savings bob 5
withdraw alice 550
withdraw alice 100
deposit alice 0
transfer bob alice 200
withdraw bob 10
withdraw bob 10
withdraw bob 10
month
withdraw bob 10
withdraw carol 5
report
```

```expected
opened checking alice
opened savings bob
error: account bob already exists
withdrew 550 from alice
error: insufficient funds in alice
error: invalid amount
transferred 200 from bob to alice
withdrew 10 from bob
withdrew 10 from bob
error: withdrawal limit reached for bob
interest paid: 7
withdrew 10 from bob
error: no account carol
alice (checking): -250
bob (savings): 777
```

```stdin
report
open gold x 5
transfer a b 1
open checking a 0
transfer a a 1
open savings b 50
transfer a b 600
transfer a b 500
transfer b a 1000
withdraw b -5
month
report
foo
```

```expected hidden
no accounts
error: unknown account type gold
error: no account a
opened checking a
error: cannot transfer to the same account
opened savings b
error: insufficient funds in a
transferred 500 from a to b
error: insufficient funds in b
error: invalid amount
interest paid: 5
a (checking): -500
b (savings): 555
error: unknown command foo
```

```stdin
open savings s 100
open checking c 0
transfer s c 10
transfer s c 10
transfer s c 10
withdraw s 1
transfer s c 1000
transfer x s 5
transfer s x 5
transfer y z 1
deposit c
month
withdraw s 5
open checking c -5
open savings n -5
withdraw c 531
withdraw c 530
report
```

```expected hidden
opened savings s
opened checking c
transferred 10 from s to c
transferred 10 from s to c
transferred 10 from s to c
error: withdrawal limit reached for s
error: withdrawal limit reached for s
error: no account x
error: no account x
error: no account y
error: invalid amount
interest paid: 0
withdrew 5 from s
error: account c already exists
error: invalid amount
error: insufficient funds in c
withdrew 530 from c
c (checking): -500
s (savings): 65
```

```checks
must virtual :: Use virtual functions in Account.
must override :: Mark the overriding functions with override.
must std::unique_ptr\s*<\s*Account\s*> :: Own the accounts with std::unique_ptr<Account>.
must throw\s+\w+ :: Report failures by throwing exceptions.
must class\s+\w+\s*:\s*public\s+BankError :: Derive specific errors (or accounts' errors) from BankError.
```
:::

## Where to go next

Congratulations: if you've worked through this guide, you know the language and its standard library
well enough to read and write real C++. Here's how to keep growing.

### Books

- **A Tour of C++** (3rd edition) by Bjarne Stroustrup: a compact overview of modern C++20 by its
  creator. A great review of everything you've learned.
- **Programming: Principles and Practice Using C++** (3rd edition), also by Stroustrup: a thorough
  textbook if you want more exercises and depth on programming itself.
- **Effective Modern C++** by Scott Meyers: 42 specific guidelines on C++11/14 (move semantics, smart
  pointers, lambdas, forwarding). Still essential reading.
- **C++ Concurrency in Action** (2nd edition) by Anthony Williams: the book on threads, atomics, and the
  memory model.
- **C++ Templates: The Complete Guide** (2nd edition) by Vandevoorde, Josuttis, and Gregor, when you want
  to master generic programming.

### Websites

- **[cppreference.com](https://en.cppreference.com)**: the reference for every language feature and
  library function, with examples and compiler-support tables. Keep it open while you code.
- **[learncpp.com](https://www.learncpp.com)**: a free, very detailed tutorial; good for a second
  explanation of anything that felt rushed here.
- **[C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/)**: best practices from Stroustrup,
  Sutter, and others.
- **[Compiler Explorer](https://godbolt.org)**: see the assembly your code compiles to, and try any
  compiler version (it's what runs your code on this site).
- **[isocpp.org](https://isocpp.org)**: news, the standardization process, and the FAQ.
- Conference talks on YouTube: CppCon, C++Now, Meeting C++, and ACCU. "Back to Basics" tracks are
  excellent next steps.

### Tools to learn

- **A build system: CMake.** Nearly every C++ project uses it. Learn to write a `CMakeLists.txt` with
  several targets and link a library.
- **A package manager:** vcpkg or Conan, to pull in libraries without pain.
- **A debugger:** gdb, lldb, or your IDE's (Visual Studio, CLion, VS Code). Breakpoints, stepping, and
  watching variables beat print statements for hard bugs.
- **Sanitizers:** `-fsanitize=address,undefined` (and `thread`) on every test run.
- **A testing framework:** GoogleTest, Catch2, or doctest. Write tests for your functions as you go.
- **Static analysis and formatting:** clang-tidy, cppcheck, and clang-format.
- **Version control:** git, if you don't use it already.

### Things to build

The best way to improve is to build something you care about:

- a command-line tool you'd actually use (a todo manager, a file renamer, a log analyzer),
- a small game with a library like SFML, SDL, or raylib,
- an interpreter for a tiny language, or a JSON parser,
- a multithreaded web crawler or chat server using Asio,
- contributions to open-source C++ projects: look for "good first issue" labels.

### Topics beyond this guide

The memory model and lock-free programming, allocators, writing your own iterators and ranges,
template metaprogramming and type traits in depth, coroutine libraries, modules in practice, performance
profiling (perf, VTune, Tracy) and cache-friendly data layout, ABI and binary compatibility, interop with
C and other languages, and the new features arriving in C++26 such as reflection and contracts.

Keep writing code, keep reading other people's code, and keep the warnings turned on. Welcome to
C++, hero.
