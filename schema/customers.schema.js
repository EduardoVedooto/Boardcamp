import Joi from "joi";
import Extension from "@joi/date";
const JoiDate = Joi.extend(Extension);


const customersSchema = data => {
    const schema = Joi.object({
        cpf: Joi.string().pattern(/^[0-9]{11}$/),
        name: Joi.string().required(),
        phone: Joi.string().pattern(/^[0-9]{10,11}$/),
        birthday: JoiDate.date().format("YYYY-MM-DD")
    });
    return schema.validate(data);
};

export default customersSchema;