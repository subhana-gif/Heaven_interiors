const User = require('../models/User');
const Address = require('../models/Address');
const Order= require('../models/order')
const bcrypt = require('bcrypt');



exports.getProfilePage = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('email username');
        const addresses = await Address.find({ userId });

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('userSide/profile', {
            user,
            addresses
        });
    } catch (error) {
        console.error('Error rendering profile page:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getPersonalInformation = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const userId = req.user._id; 
        const user = await User.findById(userId).select('email username');

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.send(`
            <h3 style="color:green">Personal Information</h3>
            <p><strong>Email:</strong> <span id="user-email">${user.email}</span></p>
            <p><strong>Username:</strong> <span id="user-username">${user.username}</span></p>
            <button id="edit-button">Edit</button>

            <form id="edit-profile-form" method="POST" action="/user/update-profile" style="display:none; margin-top: 20px;">
                <div>
                    <label><strong>Email:</strong></label>
                    <input type="email" name="email" id="edit-email" required>
                </div>
                <div>
                    <label><strong>Username:</strong></label>
                    <input type="text" name="username" id="edit-username" required>
                </div>
                <div>
                    <label><strong>New Password:</strong></label>
                    <input type="password" name="password" placeholder="New Password">
                </div>
                <button type="submit">Save Changes</button>
                <button type="button" id="cancel-button">Cancel</button>
            </form>

            <script>
                document.getElementById('edit-button').onclick = function() {
                    // Populate input fields with current user information
                    document.getElementById('edit-email').value = document.getElementById('user-email').textContent;
                    document.getElementById('edit-username').value = document.getElementById('user-username').textContent;
                    document.getElementById('edit-profile-form').style.display = 'block';
                    this.style.display = 'none'; // Hide the edit button
                };

                document.getElementById('cancel-button').onclick = function() {
                    document.getElementById('edit-profile-form').style.display = 'none';
                    document.getElementById('edit-button').style.display = 'inline'; // Show edit button again
                };
            </script>
        `);
        
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.updateProfile = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    const { email, username, password } = req.body;
    const userId = req.user._id;

    try {
        const updateData = { email, username };

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

        if (!updatedUser) {
            return res.status(404).send('User not found');
        }

        res.redirect('/user/profile');

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.updatePassword = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    const { password } = req.body;

    try {
        const user = await User.findById(req.user._id);

        user.password = await bcrypt.hash(password, 10);
        await user.save();

        res.send('Password updated successfully');
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getUserAddresses = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const userId = req.user._id; 
        const addresses = await Address.find({ userId });

        if (!addresses || addresses.length === 0) {
            return res.status(404).send('No addresses found');
        }

        let addressesHtml = '<h3 style="color:green">Your Addresses</h3>';
        addresses.forEach(address => {
            addressesHtml += `
                <div class="address">
                    <p><strong>Name:</strong> <span class="address-name">${address.name}</span></p>
                    <p><strong>Mobile Number:</strong> <span class="address-mobileNumber">${address.mobileNumber}</span></p>
                    <p><strong>Address:</strong> <span class="address-address">${address.address}, ${address.city}, ${address.state} - ${address.pinCode}</span></p>
                    
                    <button onclick="editAddress('${address._id}')" style="color:blue">Edit</button>
                    <button onclick="deleteAddress('${address._id}')" style="color:red">Delete</button>

                    <form id="edit-address-form-${address._id}" style="display:none;" onsubmit="updateAddress(event, '${address._id}')">
                        <input type="text" name="name" value="${address.name}" required>
                        <input type="text" name="mobileNumber" value="${address.mobileNumber}" required>
                        <input type="text" name="address" value="${address.address}" required>
                        <input type="text" name="city" value="${address.city}" required>
                        <input type="text" name="state" value="${address.state}" required>
                        <input type="text" name="pinCode" value="${address.pinCode}" required>
                        <button type="submit" style="color:green">Save</button>
                        <button type="button" onclick="cancelEdit('${address._id}')" style="color:red">Cancel</button>
                    </form>
                </div>
                <hr/>
            `;
        });

        addressesHtml += `
            <form id="new-address-form">
                <h4 style="color:green">Add New Address</h4>
                <input type="text" name="name" placeholder="Name" required>
                <input type="text" name="mobileNumber" placeholder="Mobile Number" required>
                <input type="text" name="address" placeholder="Address" required>
                <input type="text" name="city" placeholder="City" required>
                <input type="text" name="state" placeholder="State" required>
                <input type="text" name="pinCode" placeholder="PIN Code" required>
                <button type="submit" style="color:green">Add Address</button>
            </form>

            <script>
                function editAddress(addressId) {
                    document.getElementById('edit-address-form-' + addressId).style.display = 'block';
                    const addressDiv = document.querySelector('.address[data-id="'+ addressId +'"]');
                    addressDiv.querySelectorAll('span').forEach(span => span.style.display = 'none'); // Hide address details
                }

                function cancelEdit(addressId) {
                    document.getElementById('edit-address-form-' + addressId).style.display = 'none';
                    const addressDiv = document.querySelector('.address[data-id="'+ addressId +'"]');
                    addressDiv.querySelectorAll('span').forEach(span => span.style.display = 'inline'); // Show address details
                }

                function updateAddress(event, addressId) {
                    event.preventDefault(); // Prevent the default form submission

                    const form = document.getElementById('edit-address-form-' + addressId);
                    const formData = new FormData(form);

                    fetch('/user/addresses/' + addressId + '/edit', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => {
                        if (response.ok) {
                            window.location.reload(); // Refresh the page to see the updated address list
                        } else {
                            alert('Error updating address');
                        }
                    })
                    .catch(error => console.error('Error updating address:', error));
                }

                function deleteAddress(addressId) {
                    if (confirm('Are you sure you want to delete this address?')) {
                        fetch('/user/addresses/' + addressId, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        .then(response => {
                            if (response.ok) {
                                window.location.reload(); // Refresh the page to see the updated address list
                            } else {
                                alert('Error deleting address');
                            }
                        })
                        .catch(error => console.error('Error deleting address:', error));
                    }
                }
            </script>
        `;

        res.send(addressesHtml);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getEditAddress = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const addressId = req.params.id;
        const address = await Address.findById(addressId);

        if (!address) {
            return res.status(404).send('Address not found');
        }

        const editAddressHtml = `
            <h3 style="color:green">Edit Address</h3>
            <form id="edit-address-form" method="POST" action="/user/addresses/${addressId}/edit">
                <input type="text" name="name" value="${address.name}" required>
                <input type="text" name="mobileNumber" value="${address.mobileNumber}" required>
                <input type="text" name="address" value="${address.address}" required>
                <input type="text" name="city" value="${address.city}" required>
                <input type="text" name="state" value="${address.state}" required>
                <input type="text" name="pinCode" value="${address.pinCode}" required>
                <button type="submit" style="color:green">Update Address</button>
            </form>
        `;

        res.send(editAddressHtml);
    } catch (error) {
        console.error('Error fetching address for editing:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.updateAddress = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    const addressId = req.params.id;
    const { name, mobileNumber, address, city, state, pinCode } = req.body; 

    try {
        const updatedAddress = await Address.findByIdAndUpdate(
            addressId,
            { name, mobileNumber, address, city, state, pinCode },
            { new: true } 
        );

        if (!updatedAddress) {
            return res.status(404).send('Address not found');
        }

        res.send('Address updated successfully');
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.deleteAddress = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const addressId = req.params.id; 
        const deletedAddress = await Address.findByIdAndDelete(addressId);

        if (!deletedAddress) {
            return res.status(404).send('Address not found');
        }

        res.send('Address deleted successfully');
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.addNewAddress = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }

    const { name, mobileNumber, address, city, state, pinCode } = req.body;

    try {
        const newAddress = new Address({
            userId: req.user._id,
            name,
            mobileNumber,
            address,
            city,
            state,
            pinCode
        });

        await newAddress.save();
        res.send('Address added successfully');
    } catch (error) {
        console.error('Error adding new address:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getOrders = async (req, res) => {
    try {
        const userId = req.user.id; 
        const orders = await Order.find({ user: userId });
        res.render('userSide/orders', { orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Server Error');
    }
};