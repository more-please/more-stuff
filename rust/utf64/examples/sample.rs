use utf64::*;

fn main() {
    println!("{}", "Hello!".encode_utf64().unwrap());
    match "YHelloG".decode_utf64() {
        Ok(result) => println!("{result}"),
        Err(e) => panic!("{e}"),
    }
}
