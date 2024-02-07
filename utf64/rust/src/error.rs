use thiserror::Error;

#[derive(Error, Debug)]
pub enum Utf64Error {
    #[error("Invalid unicode code point: {0}")]
    InvalidCodePoint(u32),

    #[error("Unexpected end of input")]
    UnexpectedEOF,

    #[error("Invalid UTF-64 character: '{0}'")]
    InvalidUtf64(char),

    #[error("Invalid UTF-8 prefix: {0:x}")]
    InvalidUtf8Prefix(u8),
}
