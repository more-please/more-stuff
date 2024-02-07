use utf64::UTF64;

fn main() {
    for s in std::env::args().skip(1) {
        match s.encode_utf64() {
            Ok(enc) => println!("{s} -> {enc}"),
            Err(e) => println!("Could not encode: {e}"),
        }
    }
}
