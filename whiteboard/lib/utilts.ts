// Function used to generate a random path ID for the board.

export function randomId() {
    const id1= Math.random().toString(36).slice(2,7);
    const id2= Math.random().toString(36).slice(2,7);
    return id1 + id2;
}
