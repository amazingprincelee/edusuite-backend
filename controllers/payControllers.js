import Payment from "../models/payment.js";

export const payment = async (req, res) => {
    const {studentId, feeType, description, session, term, totalAmount, amount, method, reference, status} = req.body
    

    try {
          const currentPayment = new Payment({
            studentId: studentId,
            feeType: feeType, 
            description: description,
            session: session,
            term: term,
            totalAmount: totalAmount,
            installments: {
                amount: amount,
                method: method,
                reference: reference,
            },
            status: status,
          })  

          currentPayment.save()

          res.status(200).json({message: "Payment successfully", currentPayment})

    } catch (error) {
        res.status(500).json({message: "Internal Server error"})
        
    }


}