---
title: "Streams & Files: Challenges"
summary: Four hard problems for the streams module. A CSV sales report with exact money and a formatted table, a log-file analyzer, a key-value store persisted to a file and validated on reload, and a text justifier.
---

These problems are meant to be **hard**. Each one is a realistic text-processing program with an
exact input and output format. They combine everything from this module (string streams, files, stream
state, formatting) with containers, algorithms and error handling from earlier modules.

Work through each one on your own first: sketch the data you need, write the parsing, then the output.
Use the hints only when you're stuck, and look at the solution after your version passes; it's just one
of many reasonable designs.

General rules:

- Formats are exact. The checker ignores spaces at the end of a line, nothing else.
- Hidden tests cover the malformed and boundary cases described in each specification.
- Programs that create files must use the file name given, and remove it before they finish.

:::quiz
What does this print?

```cpp
std::istringstream in("12 34abc 56");
int a = -1, b = -1, c = -1;
in >> a >> b >> c;
std::cout << a << ' ' << b << ' ' << c << ' ' << in.fail();
```

- [ ] `12 34 56 0`
- [x] `12 34 0 1`
- [ ] `12 34 -1 1`
- [ ] `12 -1 -1 1`

`>> b` reads the digits `34` and stops at `a`, which is fine. Then `>> c` finds `abc`, which isn't a
number: the read fails, `failbit` is set, and since C++11 a failed numeric extraction stores `0` in
the target. `56` is never reached.
:::

:::quiz
What does this print?

```cpp
std::istringstream in("42\nhello world\n");
int n;
std::string s;
in >> n;
std::getline(in, s);
std::cout << n << '[' << s << ']';
```

- [ ] `42[hello world]`
- [x] `42[]`
- [ ] `42[hello]`
- [ ] `42[ hello world]`

`>> n` stops right **before** the newline after `42`. `getline` then reads up to that newline: an
empty line. Use `std::getline(in >> std::ws, s)` to skip it.
:::

:::exercise CSV sales report {hard}
Turn a CSV file of sales into a summary table per region.

**Input:** a header line that must be exactly `date,region,product,units,unit_price`, then data rows.
Lines are numbered from 1 (the header is line 1); blank lines are ignored but counted. If the header is
missing or different, print `error: bad header` and nothing else.

A row is valid when (checked in this order, warning text in parentheses):

1. it has exactly 5 fields, split at **every** comma (`expected 5 fields, got N`);
2. `region` and `product` are non-empty (`empty field`);
3. `units` is a non-negative integer of at most 9 digits (`bad units 'TEXT'`);
4. `unit_price` is digits, optionally followed by `.` and one or two digits, like `3`, `2.5`, `62.75`
   (`bad price 'TEXT'`).

Fields are used exactly as written (no trimming). For each invalid row print
`warning: line N: MESSAGE` immediately, and skip it. `date` isn't checked.

**Money must be exact:** convert prices to whole **cents** (`2.5` is 250) and compute in integers.
Doubles can't represent most decimal prices exactly.

**Output** after reading everything: if there was no valid row, print `no data`. Otherwise a table with
one row per region, sorted by revenue (highest first; ties by region name), a separator and a total:

```
REGION  UNITS  REVENUE
north      12   150.50
south       7    19.00
----------------------
TOTAL      19   169.50
best product: gizmo (125.50)
```

- Column 1 is left-aligned, columns 2 and 3 right-aligned, separated by two spaces.
- Each column is as wide as its longest entry, counting the heading and the `TOTAL` row (so at least
  `REGION`, `UNITS`, `REVENUE` wide).
- Money is printed with exactly two decimals. The separator is `-` repeated over the full width.
- The last line names the product with the highest revenue over all regions (ties: alphabetically first).

The example above comes from this input:

```
date,region,product,units,unit_price
2024-01-03,north,widget,10,2.50
2024-01-03,south,gadget,3,3.00
2024-01-04,north,gizmo,2,62.75
2024-01-04,east,widget,x,2.50
2024-01-05,west,widget,1
2024-01-05,south,widget,4,2.5
2024-01-06,,widget,1,1.00
2024-01-06,east,gadget,1,1.999
```

which first prints these warnings:

```
warning: line 5: bad units 'x'
warning: line 6: expected 5 fields, got 4
warning: line 8: empty field
warning: line 9: bad price '1.999'
```

```cpp starter
#include <iomanip>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // validate, aggregate, then print the table
    }
}
```

```cpp solution
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <map>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

std::vector<std::string> splitCsv(const std::string& line) {
    std::vector<std::string> fields(1);
    for (char c : line) {
        if (c == ',') fields.emplace_back();
        else fields.back() += c;
    }
    return fields;
}

bool allDigits(const std::string& s) {
    return !s.empty() && std::all_of(s.begin(), s.end(), [](char c) { return c >= '0' && c <= '9'; });
}

// "12", "12.5", "12.50" -> cents; anything else -> nullopt
std::optional<long long> parseCents(const std::string& s) {
    const auto dot = s.find('.');
    const std::string whole = s.substr(0, dot);
    const std::string frac = dot == std::string::npos ? "" : s.substr(dot + 1);
    if (!allDigits(whole) || whole.size() > 9) return std::nullopt;
    if (dot != std::string::npos && (frac.empty() || frac.size() > 2 || !allDigits(frac))) return std::nullopt;
    long long cents = std::stoll(whole) * 100;
    if (frac.size() == 1) cents += (frac[0] - '0') * 10;
    if (frac.size() == 2) cents += std::stoll(frac);
    return cents;
}

std::string money(long long cents) {
    std::ostringstream out;
    out << cents / 100 << '.' << std::setw(2) << std::setfill('0') << cents % 100;
    return out.str();
}

struct Totals {
    long long units = 0;
    long long cents = 0;
};

int main() {
    std::string line;
    if (!std::getline(std::cin, line) || line != "date,region,product,units,unit_price") {
        std::cout << "error: bad header\n";
        return 0;
    }
    std::map<std::string, Totals> regions;
    std::map<std::string, long long> products;
    int lineNo = 1;
    while (std::getline(std::cin, line)) {
        ++lineNo;
        if (line.empty()) continue;
        std::vector<std::string> f = splitCsv(line);
        std::string problem;
        std::optional<long long> price;
        if (f.size() != 5) problem = "expected 5 fields, got " + std::to_string(f.size());
        else if (f[1].empty() || f[2].empty()) problem = "empty field";
        else if (!allDigits(f[3]) || f[3].size() > 9) problem = "bad units '" + f[3] + "'";
        else if (!(price = parseCents(f[4]))) problem = "bad price '" + f[4] + "'";
        if (!problem.empty()) {
            std::cout << "warning: line " << lineNo << ": " << problem << '\n';
            continue;
        }
        const long long units = std::stoll(f[3]);
        Totals& t = regions[f[1]];
        t.units += units;
        t.cents += units * *price;
        products[f[2]] += units * *price;
    }

    if (regions.empty()) {
        std::cout << "no data\n";
        return 0;
    }

    std::vector<std::pair<std::string, Totals>> rows(regions.begin(), regions.end());
    std::stable_sort(rows.begin(), rows.end(), [](const auto& a, const auto& b) {
        return a.second.cents > b.second.cents;   // map order already breaks ties by name
    });
    Totals total;
    for (const auto& [name, t] : rows) {
        total.units += t.units;
        total.cents += t.cents;
    }

    std::size_t w1 = std::string("REGION").size();
    std::size_t w2 = std::string("UNITS").size();
    std::size_t w3 = std::string("REVENUE").size();
    for (const auto& [name, t] : rows) w1 = std::max(w1, name.size());
    w2 = std::max(w2, std::to_string(total.units).size());
    w3 = std::max(w3, money(total.cents).size());

    auto row = [&](const std::string& a, const std::string& b, const std::string& c) {
        std::cout << std::left << std::setw(static_cast<int>(w1)) << a << "  " << std::right
                  << std::setw(static_cast<int>(w2)) << b << "  " << std::setw(static_cast<int>(w3)) << c << '\n';
    };
    row("REGION", "UNITS", "REVENUE");
    for (const auto& [name, t] : rows) row(name, std::to_string(t.units), money(t.cents));
    std::cout << std::string(w1 + w2 + w3 + 4, '-') << '\n';
    row("TOTAL", std::to_string(total.units), money(total.cents));

    auto best = products.begin();
    for (auto it = products.begin(); it != products.end(); ++it)
        if (it->second > best->second) best = it;
    std::cout << "best product: " << best->first << " (" << money(best->second) << ")\n";
}
```

```hint
Split on commas by hand (start with one empty field and begin a new one at every `,`): `getline` with
`','` drops a trailing empty field, so `a,b,c,d,` would wrongly look like 4 fields.
```

```hint
Parse prices yourself: the part before the dot times 100, plus the decimals (`5` → 50, `05` → 5). Then
format cents back with `cents / 100`, a `.`, and `std::setw(2) << std::setfill('0') << cents % 100`
on a `std::ostringstream`.
```

```hint
Compute the column widths **before** printing: build every cell as a string first, take the maximum
length per column, then print with `std::left`/`std::right` and `std::setw`. A `std::stable_sort` on
revenue keeps the map's alphabetical order for ties.
```

```stdin
date,region,product,units,unit_price
2024-01-03,north,widget,10,2.50
2024-01-03,south,gadget,3,3.00
2024-01-04,north,gizmo,2,62.75
2024-01-04,east,widget,x,2.50
2024-01-05,west,widget,1
2024-01-05,south,widget,4,2.5
2024-01-06,,widget,1,1.00
2024-01-06,east,gadget,1,1.999
```

```expected
warning: line 5: bad units 'x'
warning: line 6: expected 5 fields, got 4
warning: line 8: empty field
warning: line 9: bad price '1.999'
REGION  UNITS  REVENUE
north      12   150.50
south       7    19.00
----------------------
TOTAL      19   169.50
best product: gizmo (125.50)
```

```stdin
date,region,product,units,unit_price
d,asia-pacific,cable,1000000,0.05
d,eu,cable,1,50000

d,us,plug,0,9.99
d,eu,plug,3,.5
d,eu,plug,3,5.
d,eu,plug,-3,5
d,eu,plug,3,1e2
d,eu,plug, 3,5
d,eu,plug,3,5,
d,us,cable,2,25000
d,us,adapter,1,0.01
```

```expected hidden
warning: line 6: bad price '.5'
warning: line 7: bad price '5.'
warning: line 8: bad units '-3'
warning: line 9: bad price '1e2'
warning: line 10: bad units ' 3'
warning: line 11: expected 5 fields, got 6
REGION          UNITS    REVENUE
us                  3   50000.01
asia-pacific  1000000   50000.00
eu                  1   50000.00
--------------------------------
TOTAL         1000004  150000.01
best product: cable (150000.00)
```

```stdin
date,region,product,units,unit_price
x,b,p,1,1
x,a,q,1,1
x,c,q,1,0.99
```

```expected hidden
REGION  UNITS  REVENUE
a           1     1.00
b           1     1.00
c           1     0.99
----------------------
TOTAL       3     2.99
best product: q (1.99)
```

```stdin
date,region,product,units,unit_price
oops
```

```expected hidden
warning: line 2: expected 5 fields, got 1
no data
```

```stdin
Date,Region,Product,Units,Unit_price
x,a,b,1,1
```

```expected hidden
error: bad header
```

```checks
must setw :: Lay out the table with std::setw.
must getline :: Read the file line by line with std::getline.
```
:::

:::exercise Log-file analyzer {hard}
Summarize a server log.

**Input:** log lines; blank lines are ignored entirely. A valid line starts with four
whitespace-separated words, followed by an optional message:

```
2024-03-01 12:00:05 ERROR db: connection refused
```

1. a date `YYYY-MM-DD` (exactly that shape, digits; month 1 to 12, day 1 to 31),
2. a time `HH:MM:SS` (exactly that shape; hour at most 23, minutes and seconds at most 59),
3. a level: `DEBUG`, `INFO`, `WARN` or `ERROR` (exactly, uppercase),
4. a component name followed directly by `:` (at least one character before the colon).

Any other non-blank line is **malformed**: count it and otherwise ignore it.

**Output:**

```
lines: <non-blank lines> (<malformed> malformed)
from <earliest timestamp> to <latest timestamp>
DEBUG: <count>
INFO: <count>
WARN: <count>
ERROR: <count>
top errors:
  <component>: <ERROR count>
busiest minute: <YYYY-MM-DD HH:MM> (<count> entries)
```

- Lines aren't necessarily in time order. A timestamp is `date time` (as in the input).
- `top errors:` lists up to 3 components with the most `ERROR` lines (ties: alphabetical). If there are
  no errors at all, the line is `top errors: none`.
- The busiest minute is the minute (`YYYY-MM-DD HH:MM`) with the most valid lines; ties go to the
  earliest.
- If there are no valid lines, print only the `lines:` line and then `no valid entries`.

```cpp starter
#include <iostream>
#include <map>
#include <sstream>
#include <string>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // classify and count each line
    }
}
```

```cpp solution
#include <algorithm>
#include <array>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

// Is s exactly `pattern`, where 'D' stands for any digit?
bool matches(const std::string& s, const std::string& pattern) {
    if (s.size() != pattern.size()) return false;
    for (std::size_t i = 0; i < s.size(); ++i) {
        if (pattern[i] == 'D' ? (s[i] < '0' || s[i] > '9') : s[i] != pattern[i]) return false;
    }
    return true;
}

int num(const std::string& s, std::size_t pos, std::size_t len) { return std::stoi(s.substr(pos, len)); }

bool validTimestamp(const std::string& date, const std::string& time) {
    if (!matches(date, "DDDD-DD-DD") || !matches(time, "DD:DD:DD")) return false;
    const int month = num(date, 5, 2), day = num(date, 8, 2);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 && num(time, 0, 2) <= 23 &&
           num(time, 3, 2) <= 59 && num(time, 6, 2) <= 59;
}

int main() {
    const std::array<std::string, 4> levels{"DEBUG", "INFO", "WARN", "ERROR"};
    std::map<std::string, int> perLevel;
    std::map<std::string, int> errorsPerComponent;
    std::map<std::string, int> perMinute;
    std::string first, last;
    int total = 0, malformed = 0;

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.find_first_not_of(" \t") == std::string::npos) continue;
        ++total;
        std::istringstream in(line);
        std::string date, time, level, component;
        if (!(in >> date >> time >> level >> component) || !validTimestamp(date, time) ||
            std::find(levels.begin(), levels.end(), level) == levels.end() || component.size() < 2 ||
            component.back() != ':') {
            ++malformed;
            continue;
        }
        component.pop_back();
        const std::string stamp = date + ' ' + time;
        if (first.empty() || stamp < first) first = stamp;
        if (last.empty() || stamp > last) last = stamp;
        ++perLevel[level];
        if (level == "ERROR") ++errorsPerComponent[component];
        ++perMinute[stamp.substr(0, 16)];
    }

    std::cout << "lines: " << total << " (" << malformed << " malformed)\n";
    if (total == malformed) {
        std::cout << "no valid entries\n";
        return 0;
    }
    std::cout << "from " << first << " to " << last << '\n';
    for (const auto& level : levels) std::cout << level << ": " << perLevel[level] << '\n';

    std::vector<std::pair<std::string, int>> top(errorsPerComponent.begin(), errorsPerComponent.end());
    std::stable_sort(top.begin(), top.end(), [](const auto& a, const auto& b) { return a.second > b.second; });
    if (top.size() > 3) top.resize(3);
    std::cout << "top errors:";
    if (top.empty()) std::cout << " none";
    std::cout << '\n';
    for (const auto& [component, count] : top) std::cout << "  " << component << ": " << count << '\n';

    auto busiest = perMinute.begin();
    for (auto it = perMinute.begin(); it != perMinute.end(); ++it)
        if (it->second > busiest->second) busiest = it;
    std::cout << "busiest minute: " << busiest->first << " (" << busiest->second << " entries)\n";
}
```

```hint
Read each line with `std::getline` and take it apart with a `std::istringstream`:
`in >> date >> time >> level >> component` must succeed, and then each word is validated. Checking a
fixed shape like `DDDD-DD-DD` is easiest with a tiny helper that compares character by character.
```

```hint
Timestamps in this format sort correctly as plain strings, so `first`/`last` are just the minimum and
maximum strings, and the minute is the first 16 characters. A `std::map` keyed by minute keeps them in
time order, which makes "ties go to the earliest" free.
```

```stdin
2024-03-01 12:00:01 INFO server: started
2024-03-01 12:00:05 ERROR db: connection refused
2024-03-01 12:01:00 WARN auth: slow login
2024-03-01 12:01:10 ERROR auth: bad password
2024-03-01 12:01:11 ERROR auth: bad password
2024-03-01 12:01:59 ERROR db: timeout
this line is garbage
2024-02-30 25:00:00 INFO x: bad hour
2024-03-01 11:59:59 DEBUG cache: warmup
2024-03-01 12:02:00 FATAL core: unknown level
2024-03-01 12:03:00 ERROR cache: miss
```

```expected
lines: 11 (3 malformed)
from 2024-03-01 11:59:59 to 2024-03-01 12:03:00
DEBUG: 1
INFO: 1
WARN: 1
ERROR: 5
top errors:
  auth: 2
  db: 2
  cache: 1
busiest minute: 2024-03-01 12:01 (4 entries)
```

```stdin
2023-12-31 23:59:59 INFO app: last second

2024-01-01 00:00:00 INFO app: new year
2024-13-01 00:00:00 INFO app: bad month
2024-01-00 00:00:00 INFO app: bad day
2024-1-01 00:00:00 INFO app: short month
2024-01-01 00:60:00 INFO app: bad minute
2024-01-01 00:00:00 info app: lowercase level
2024-01-01 00:00:00 INFO : empty component
2024-01-01 00:00:00 INFO app missing colon
2024-01-01 00:00:00 INFO
2024-01-01 00:00:30 WARN app:
2023-12-31 23:59:00 DEBUG  spaced:   extra   spaces
```

```expected hidden
lines: 12 (8 malformed)
from 2023-12-31 23:59:00 to 2024-01-01 00:00:30
DEBUG: 1
INFO: 2
WARN: 1
ERROR: 0
top errors: none
busiest minute: 2023-12-31 23:59 (2 entries)
```

```stdin
2024-05-05 10:00:00 ERROR zeta: a
2024-05-05 10:00:00 ERROR beta: b
2024-05-05 10:00:00 ERROR alpha: c
2024-05-05 10:00:00 ERROR gamma: d
2024-05-05 10:00:00 ERROR gamma: e
2024-05-05 09:00:00 ERROR delta: f
2024-05-05 09:00:00 ERROR delta: g
2024-05-05 09:00:00 INFO delta: h
```

```expected hidden
lines: 8 (0 malformed)
from 2024-05-05 09:00:00 to 2024-05-05 10:00:00
DEBUG: 0
INFO: 1
WARN: 0
ERROR: 7
top errors:
  delta: 2
  gamma: 2
  alpha: 1
busiest minute: 2024-05-05 10:00 (5 entries)
```

```stdin
not a log
   
also not
```

```expected hidden
lines: 2 (2 malformed)
no valid entries
```

```checks
must istringstream|stringstream :: Take each line apart with a string stream.
must getline :: Read the log line by line.
```
:::

:::exercise Persistent key-value store {hard}
Build a tiny database: a key-value store that lives in memory, can be **saved** to a file, and **loaded**
back, with the loader rejecting damaged files without losing the data in memory.

The store file is called `ex_kvstore.db`. Delete it when the program starts (so every run starts
fresh) and again before the program ends.

**File format** (exactly this, so other programs could read it):

```
KV1
<number of entries>
<key> <value>
<key> <value>
```

One entry per line, in key order: the key, **one** space, then the value (which may be empty, so an
entry can end with that space). Keys never contain spaces; values never contain newlines.

**Commands**, one per line (blank lines ignored):

| Command | Output |
| --- | --- |
| `set KEY VALUE` | `ok`. The value is everything after the space that follows `KEY`; it may contain spaces and be empty (`set k` sets `k` to the empty value). |
| `get KEY` | `KEY = VALUE`, or `KEY not found` |
| `del KEY` | `deleted KEY`, or `KEY not found` |
| `list` | every entry as `KEY = VALUE` sorted by key, or `(empty)` |
| `save` | write the file (replacing it); `saved N keys` |
| `load` | replace the store with the file's contents; `loaded N keys` |
| `raw TEXT` | append the line `TEXT` to the file (creating it if needed), printing nothing: it simulates someone editing the file |
| `rmfile` | delete the file, printing nothing |

Anything else (including `set` without a key, and extra words after `get`, `del`, `list`, `save`,
`load`, `rmfile`) prints `error: bad command`.

`load` errors (the store in memory must stay **exactly** as it was):

| Problem | Message |
| --- | --- |
| the file doesn't exist | `error: no saved data` |
| line 1 isn't exactly `KV1` | `error: corrupt file: bad header` |
| line 2 isn't a non-negative integer (digits only) | `error: corrupt file: bad count` |
| an entry line has no space, or starts with one (empty key) | `error: corrupt file: bad entry on line L` |
| a key appears twice | `error: corrupt file: duplicate key KEY on line L` |
| the number of entries doesn't match line 2 | `error: corrupt file: expected N entries, found M` |

`L` is the line number in the file (the first entry is on line 3). Check the lines in order and report
the first problem; the count is compared after reading every line.

```cpp starter
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <sstream>
#include <string>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // handle one command
    }
}
```

```cpp solution
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>

const std::string kFile = "ex_kvstore.db";

class CorruptFile : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

using Store = std::map<std::string, std::string>;

void save(const Store& store) {
    std::ofstream out(kFile, std::ios::trunc);
    out << "KV1\n" << store.size() << '\n';
    for (const auto& [key, value] : store) out << key << ' ' << value << '\n';   // "k " for an empty value
}

// Reads the whole file into a fresh map; throws CorruptFile, so the caller's store stays untouched.
Store load(std::istream& in) {
    std::string line;
    if (!std::getline(in, line) || line != "KV1") throw CorruptFile("bad header");
    if (!std::getline(in, line) || line.empty() || line.find_first_not_of("0123456789") != std::string::npos)
        throw CorruptFile("bad count");
    const std::size_t expected = std::stoul(line);
    Store result;
    std::size_t found = 0;
    int lineNo = 2;
    while (std::getline(in, line)) {
        ++lineNo;
        const auto space = line.find(' ');
        if (space == std::string::npos || space == 0)
            throw CorruptFile("bad entry on line " + std::to_string(lineNo));
        std::string key = line.substr(0, space);
        if (result.contains(key))
            throw CorruptFile("duplicate key " + key + " on line " + std::to_string(lineNo));
        result[key] = line.substr(space + 1);
        ++found;
    }
    if (found != expected)
        throw CorruptFile("expected " + std::to_string(expected) + " entries, found " + std::to_string(found));
    return result;
}

int main() {
    std::filesystem::remove(kFile);   // start fresh
    Store store;
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string cmd;
        if (!(in >> cmd)) continue;
        std::string key, extra;
        if (cmd == "set") {
            // everything after "set KEY " is the value (it may be empty or contain spaces)
            const auto keyStart = line.find_first_not_of(' ', line.find("set") + 3);
            if (keyStart == std::string::npos) {
                std::cout << "error: bad command\n";
                continue;
            }
            const auto keyEnd = line.find(' ', keyStart);
            key = line.substr(keyStart, keyEnd - keyStart);
            store[key] = keyEnd == std::string::npos ? "" : line.substr(keyEnd + 1);
            std::cout << "ok\n";
        } else if ((cmd == "get" || cmd == "del") && (in >> key) && !(in >> extra)) {
            auto it = store.find(key);
            if (it == store.end()) {
                std::cout << key << " not found\n";
            } else if (cmd == "get") {
                std::cout << key << " = " << it->second << '\n';
            } else {
                store.erase(it);
                std::cout << "deleted " << key << '\n';
            }
        } else if (cmd == "list" && !(in >> extra)) {
            if (store.empty()) std::cout << "(empty)\n";
            for (const auto& [k, v] : store) std::cout << k << " = " << v << '\n';
        } else if (cmd == "save" && !(in >> extra)) {
            save(store);
            std::cout << "saved " << store.size() << " keys\n";
        } else if (cmd == "load" && !(in >> extra)) {
            std::ifstream file(kFile);
            if (!file) {
                std::cout << "error: no saved data\n";
                continue;
            }
            try {
                Store loaded = load(file);
                store.swap(loaded);   // commit only after the whole file was valid
                std::cout << "loaded " << store.size() << " keys\n";
            } catch (const CorruptFile& e) {
                std::cout << "error: corrupt file: " << e.what() << '\n';
            }
        } else if (cmd == "raw") {
            std::ofstream file(kFile, std::ios::app);
            const auto start = line.find("raw") + 3;
            file << (start < line.size() ? line.substr(start + 1) : "") << '\n';
        } else if (cmd == "rmfile" && !(in >> extra)) {
            std::filesystem::remove(kFile);
        } else {
            std::cout << "error: bad command\n";
        }
    }
    std::filesystem::remove(kFile);
}
```

```hint
Write `load` as a function that reads the file into a **new** `std::map` and throws on the first
problem. Only when it returns successfully, `swap` the new map into the store. That's the strong
guarantee from the exceptions module, applied to file input.
```

```hint
Parse `set` from the raw line, not with `>>`: `>>` would drop the spaces inside the value. Find the key's
start, the space after it, and take the rest of the line as the value.
```

```hint
Open the file in a local `std::ofstream`/`std::ifstream` for each command, so it's closed (and flushed)
before the next command touches it. `std::ios::app` appends for `raw`.
```

```stdin
load
set name Ada Lovelace
set empty
set eq a=b = c
get name
get empty
get nobody
save
del name
del name
list
load
list
```

```expected
error: no saved data
ok
ok
ok
name = Ada Lovelace
empty =
nobody not found
saved 3 keys
deleted name
name not found
empty =
eq = a=b = c
loaded 3 keys
empty =
eq = a=b = c
name = Ada Lovelace
```

```stdin
set a 1
save
raw extra line
set b 2
load
list
rmfile
load
raw KV1
raw 1
raw k v
load
list
raw k again
load
list
rmfile
raw KV2
load
rmfile
raw KV1
raw x
load
rmfile
raw KV1
raw 2
raw nospace
load
rmfile
raw KV1
raw 1
raw  leading
load
rmfile
raw KV1
raw 0
load
list
```

```expected hidden
ok
saved 1 keys
ok
error: corrupt file: expected 1 entries, found 2
a = 1
b = 2
error: no saved data
loaded 1 keys
k = v
error: corrupt file: duplicate key k on line 4
k = v
error: corrupt file: bad header
error: corrupt file: bad count
error: corrupt file: bad entry on line 3
error: corrupt file: bad entry on line 3
loaded 0 keys
(empty)
```

```stdin
set k
save
del k
load
get k
set  spaced   two  spaces 
get spaced
fly
get
get a b
list extra
set
del
```

```expected hidden
ok
saved 1 keys
deleted k
loaded 1 keys
k =
ok
spaced =   two  spaces
error: bad command
error: bad command
error: bad command
error: bad command
error: bad command
error: bad command
```

```checks
must ofstream :: Write the file with std::ofstream.
must ifstream :: Read it back with std::ifstream.
must remove :: Delete the file with std::filesystem::remove.
```
:::

:::exercise Text justifier {hard}
Format text into **fully justified** lines, like a newspaper column.

**Input:** the first line is the width `W` (10 ≤ W ≤ 100). The rest is text. Words are separated by any
whitespace; one or more blank (or whitespace-only) lines separate **paragraphs**.

**Rules**, per paragraph:

- Fill lines greedily: put as many words on a line as fit with **one** space between them (total length
  at most `W`).
- Then justify each line except the **last line of the paragraph**: add extra spaces between the words
  until the line is exactly `W` long. Spread them as evenly as possible; when they don't divide evenly,
  the **leftmost** gaps get one more.
- The last line of a paragraph, and any line holding a single word, is left-aligned with single spaces.
- A word longer than `W` goes on a line of its own, unchanged.

**Output:** each line between `|` characters, padded with spaces to `W` (a too-long word just sits
between the bars). Print one empty line between paragraphs. Finally, `paragraphs: P, lines: L`.

For `W = 20`:

```
The quick brown fox jumps over the lazy dog.
It was the best of times.
```

gives

```
|The  quick brown fox|
|jumps  over the lazy|
|dog. It was the best|
|of times.           |
paragraphs: 1, lines: 4
```

The first line has 16 letters and 3 gaps: 4 spaces in total, so the first gap gets 2.

```cpp starter
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

int main() {
    std::string line;
    std::getline(std::cin, line);   // the width
    // read the paragraphs, then print them justified
}
```

```cpp solution
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

// Builds one output line from words[begin, end). `last` lines and single words are left-aligned.
std::string buildLine(const std::vector<std::string>& words, std::size_t begin, std::size_t end,
                      std::size_t width, bool last) {
    std::size_t letters = 0;
    for (std::size_t i = begin; i < end; ++i) letters += words[i].size();
    const std::size_t gaps = end - begin - 1;
    std::ostringstream out;
    if (last || gaps == 0) {
        for (std::size_t i = begin; i < end; ++i) out << (i > begin ? " " : "") << words[i];
    } else {
        const std::size_t spaces = width - letters;
        for (std::size_t i = begin; i < end; ++i) {
            out << words[i];
            const std::size_t g = i - begin;   // gap index after this word
            if (g < gaps) out << std::string(spaces / gaps + (g < spaces % gaps ? 1 : 0), ' ');
        }
    }
    return out.str();
}

int main() {
    std::size_t width = 0;
    std::string line;
    std::getline(std::cin, line);
    width = std::stoul(line);

    std::vector<std::vector<std::string>> paragraphs;
    bool inParagraph = false;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string word;
        bool any = false;
        while (in >> word) {
            if (!inParagraph) paragraphs.emplace_back();
            inParagraph = any = true;
            paragraphs.back().push_back(word);
        }
        if (!any) inParagraph = false;   // a blank line ends the paragraph
    }

    int lines = 0;
    for (std::size_t p = 0; p < paragraphs.size(); ++p) {
        if (p > 0) std::cout << '\n';
        const auto& words = paragraphs[p];
        std::size_t begin = 0;
        while (begin < words.size()) {
            std::size_t end = begin + 1;
            std::size_t used = words[begin].size();
            while (end < words.size() && used + 1 + words[end].size() <= width) used += 1 + words[end++].size();
            std::string text = buildLine(words, begin, end, width, end == words.size());
            if (text.size() < width) text += std::string(width - text.size(), ' ');
            std::cout << '|' << text << "|\n";
            ++lines;
            begin = end;
        }
    }
    std::cout << "paragraphs: " << paragraphs.size() << ", lines: " << lines << '\n';
}
```

```hint
First collect each paragraph as a `std::vector<std::string>` of words: read lines with `getline`, split
each with a `std::istringstream`, and start a new paragraph after a line with no words.
```

```hint
For a line of words `begin..end` with `letters` characters and `gaps = count - 1`, there are
`W - letters` spaces to place: every gap gets `spaces / gaps`, and the first `spaces % gaps` gaps get one
more.
```

```hint
Padding the last line: `text + std::string(W - text.size(), ' ')`, but only when `text` is shorter than
`W` (a long word is longer, and `W - text.size()` would underflow on a `std::size_t`).
```

```stdin
20
The quick brown fox jumps over the lazy dog.
It was the best of times.
```

```expected
|The  quick brown fox|
|jumps  over the lazy|
|dog. It was the best|
|of times.           |
paragraphs: 1, lines: 4
```

```stdin
20
The quick brown fox jumps over the lazy dog.
It was the best of times.


short

A supercalifragilisticexpialidocious word stands alone here.
```

```expected
|The  quick brown fox|
|jumps  over the lazy|
|dog. It was the best|
|of times.           |

|short               |

|A                   |
|supercalifragilisticexpialidocious|
|word   stands  alone|
|here.               |
paragraphs: 3, lines: 9
```

```stdin
10
   a  b   c   d   e   f   g   h   i  
	
exactly10c
exactly10c and
12345 1234
x
```

```expected hidden
|a  b c d e|
|f g h i   |

|exactly10c|
|exactly10c|
|and  12345|
|1234 x    |
paragraphs: 2, lines: 6
```

```stdin
15
one two three four five six seven eight nine ten eleven twelve
   
  
Wonderful   morning,   isn't it?
```

```expected hidden
|one  two  three|
|four  five  six|
|seven     eight|
|nine ten eleven|
|twelve         |

|Wonderful      |
|morning,  isn't|
|it?            |
paragraphs: 2, lines: 8
```

```stdin
30
```

```expected hidden
paragraphs: 0, lines: 0
```

```checks
must istringstream|stringstream :: Split lines into words with a string stream.
```
:::
