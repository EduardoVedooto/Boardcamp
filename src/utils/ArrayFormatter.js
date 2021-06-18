import DateFormatter from "./DateFormatter.js"

const ArrayFormatter = (obj) => {
    const {
        id,
        customerId,
        gameId,
        rentDate,
        daysRented,
        returnDate,
        originalPrice,
        delayFee,
        customerName,
        gameName,
        categoryId,
        categoryName
    } = obj

    return {
        id,
        customerId,
        gameId,
        rentDate: DateFormatter(new Date(rentDate)),
        daysRented,
        returnDate: returnDate ? DateFormatter(new Date(returnDate)) : null,
        originalPrice,
        delayFee,
        customer: {
            id: customerId,
            name: customerName
        },
        game: {
            id: gameId,
            name: gameName,
            categoryId,
            categoryName
        }
    }
}

export default ArrayFormatter;