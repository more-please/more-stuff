use utf64::UTF64;

fn main() {
    for s in std::env::args().skip(1) {
        match s.decode_utf64() {
            Ok(dec) => println!("decoded {s} into: '{dec}'"),
            Err(e) => println!("Could not decode {s}: {e}"),
        }
    }
}
